import { createId } from "@/lib/api/create-id";
import { getWorkspaceUsers } from "@/lib/api/get-workspace-users";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { getSocialContent } from "@/lib/api/scrape-creators/get-social-content";
import { BOUNTY_MAX_SUBMISSION_URLS } from "@/lib/bounty/constants";
import { addFrequency, getCurrentPeriodNumber } from "@/lib/bounty/periods";
import { resolveBountyDetails } from "@/lib/bounty/utils";
import {
  createBountySubmissionInputSchema,
  submissionRequirementsSchema,
} from "@/lib/zod/schemas/bounties";
import { sendBatchEmail, sendEmail } from "@dub/email";
import NewBountySubmission from "@dub/email/templates/bounty-new-submission";
import BountySubmitted from "@dub/email/templates/bounty-submitted";
import { prisma } from "@dub/prisma";
import {
  BountySubmission,
  Partner,
  PlatformType,
  Prisma,
  WorkspaceRole,
} from "@dub/prisma/client";
import { getDomainWithoutWWW, isValidUrl } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { formatDistanceToNow, isBefore } from "date-fns";
import * as z from "zod/v4";
import { SOCIAL_URL_HOST_TO_PLATFORM } from "../social-content";

type CreateBountySubmissionParams = z.infer<
  typeof createBountySubmissionInputSchema
> & {
  partner: Pick<Partner, "id" | "name" | "image" | "email">;
};

type BountyWithRelations = Prisma.BountyGetPayload<{
  include: {
    groups: true;
    submissions: true;
  };
}>;

export class BountySubmissionHandler {
  // Input
  private partner: CreateBountySubmissionParams["partner"];
  private programId: string;
  private bountyId: string;
  private files: z.infer<typeof createBountySubmissionInputSchema>["files"];
  private urls: string[];
  private description?: string;
  private isDraft: boolean;
  private periodNumber?: number;

  // Resolved state
  private bounty: BountyWithRelations;
  private finalPeriodNumber: number;
  private submissions: BountySubmission[];
  private submissionData: Partial<Prisma.BountySubmissionUncheckedCreateInput>;
  private programEnrollment: Prisma.ProgramEnrollmentGetPayload<{
    include: {};
  }>;

  constructor(params: CreateBountySubmissionParams) {
    this.partner = params.partner;
    this.programId = params.programId;
    this.bountyId = params.bountyId;
    this.files = params.files;
    this.urls = params.urls;
    this.description = params.description;
    this.isDraft = params.isDraft;
    this.periodNumber = params.periodNumber;
  }

  async submit(): Promise<BountySubmission> {
    await this.fetchBountyAndEnrollment();

    this.resolvePeriodNumber();

    this.validateEligibility();

    this.validateRequirements();

    await this.validateSocialContent();

    this.mergeSubmissionData();

    const submission = await this.persist();

    this.sendNotifications(submission);

    return submission;
  }

  // Fetch the bounty and program enrollment
  private async fetchBountyAndEnrollment() {
    const [programEnrollment, bounty] = await Promise.all([
      getProgramEnrollmentOrThrow({
        partnerId: this.partner.id,
        programId: this.programId,
        include: {},
      }),

      prisma.bounty.findUniqueOrThrow({
        where: {
          id: this.bountyId,
        },
        include: {
          groups: true,
          submissions: {
            where: {
              partnerId: this.partner.id,
            },
          },
        },
      }),
    ]);

    this.programEnrollment = programEnrollment;
    this.bounty = bounty;
    this.submissions = bounty.submissions;
  }

  // Resolve the period number for the submission
  private resolvePeriodNumber() {
    const isMultiSubmission = this.bounty.maxSubmissions > 1;

    if (!isMultiSubmission) {
      this.finalPeriodNumber = 1;
      return;
    }

    // Multi-submission WITHOUT frequency — all periods open
    if (!this.bounty.submissionFrequency) {
      if (!this.periodNumber) {
        throw new Error("Period number is required for this bounty.");
      }

      if (
        this.periodNumber < 1 ||
        this.periodNumber > this.bounty.maxSubmissions
      ) {
        throw new Error("Invalid submission period number.");
      }

      this.finalPeriodNumber = this.periodNumber;
      return;
    }

    // Multi-submission WITH frequency — time-gated
    const currentPeriod = getCurrentPeriodNumber({
      startsAt: this.bounty.startsAt,
      endsAt: this.bounty.endsAt,
      submissionFrequency: this.bounty.submissionFrequency,
      maxSubmissions: this.bounty.maxSubmissions,
    });

    let periodNumber: number;

    if (this.periodNumber) {
      periodNumber = this.periodNumber;
    } else {
      if (!currentPeriod) {
        throw new Error("No active submission period for this bounty.");
      }

      periodNumber = currentPeriod;
    }

    if (periodNumber < 1 || periodNumber > this.bounty.maxSubmissions) {
      throw new Error("Invalid submission period number.");
    }

    // Validate the period has started
    const periodStart = addFrequency({
      date: this.bounty.startsAt,
      frequency: this.bounty.submissionFrequency,
      amount: periodNumber - 1,
    });

    if (new Date() < periodStart) {
      throw new Error("This submission period hasn't started yet.");
    }

    if (currentPeriod && periodNumber < currentPeriod) {
      throw new Error("This submission period has already closed.");
    }

    this.finalPeriodNumber = periodNumber;
  }

  // Validate the eligibility of the submission
  private validateEligibility() {
    if (!["approved", "pending"].includes(this.programEnrollment.status)) {
      throw new Error(
        "You are not allowed to submit a bounty for this program.",
      );
    }

    if (this.bounty.programId !== this.programId) {
      throw new Error("This bounty is not for this program.");
    }

    // Check existing submission for this period
    const existingSubmission = this.submissions.find(
      (s) => s.periodNumber === this.finalPeriodNumber,
    );

    const bountyInfo = resolveBountyDetails(this.bounty);

    if (existingSubmission) {
      if (
        existingSubmission.reviewedAt ||
        existingSubmission.status === "approved" ||
        existingSubmission.status === "rejected"
      ) {
        throw new Error(
          `You already have a ${existingSubmission.status} submission for this period.`,
        );
      }

      if (
        existingSubmission.status !== "draft" &&
        !bountyInfo?.hasSocialMetrics
      ) {
        throw new Error(
          `You already have a ${existingSubmission.status} submission for this period.`,
        );
      }
    }

    // Check group membership
    if (this.bounty.groups.length > 0) {
      const isInGroup = this.bounty.groups.find(
        ({ groupId }) => groupId === this.programEnrollment.groupId,
      );

      if (!isInGroup) {
        throw new Error("You are not allowed to submit this bounty.");
      }
    }

    // Validate bounty dates and status
    const now = new Date();

    if (this.bounty.startsAt && this.bounty.startsAt > now) {
      throw new Error("This bounty is not yet available.");
    }

    if (this.bounty.endsAt && this.bounty.endsAt < now) {
      throw new Error("This bounty is no longer available.");
    }

    if (this.bounty.archivedAt) {
      throw new Error("This bounty is archived.");
    }

    if (this.bounty.type === "performance") {
      throw new Error("You are not allowed to submit a performance bounty.");
    }

    if (
      !this.isDraft &&
      this.bounty.submissionsOpenAt &&
      this.bounty.submissionsOpenAt > now
    ) {
      const waitTime = formatDistanceToNow(this.bounty.submissionsOpenAt, {
        addSuffix: true,
      });

      throw new Error(
        `Submissions are not open yet. You can submit ${waitTime}.`,
      );
    }

    if (bountyInfo?.hasSocialMetrics && this.isDraft) {
      throw new Error(
        "Draft submissions are not allowed for social metrics bounties.",
      );
    }
  }

  // Validate the requirements of the submission
  private validateRequirements() {
    const submissionRequirements = submissionRequirementsSchema
      .nullable()
      .parse(this.bounty.submissionRequirements);

    const requireImage = !!submissionRequirements?.image;
    const requireUrl = !!submissionRequirements?.url;
    const urlRequirement = submissionRequirements?.url || null;
    const imageRequirement = submissionRequirements?.image || null;

    this.submissionData = {
      status: this.isDraft ? "draft" : "submitted",
    };

    if (!this.isDraft) {
      if (requireImage && this.files.length === 0) {
        throw new Error("You must submit an image.");
      }

      if (requireUrl && this.urls.length === 0) {
        throw new Error("You must submit a URL.");
      }

      this.validateUrlDomains(urlRequirement);

      // Validate max count for URLs
      if (urlRequirement?.max && this.urls.length > urlRequirement.max) {
        throw new Error(
          `You can submit at most ${urlRequirement.max} URL${urlRequirement.max === 1 ? "" : "s"}.`,
        );
      }

      // Validate max count for images
      if (imageRequirement?.max && this.files.length > imageRequirement.max) {
        throw new Error(
          `You can submit at most ${imageRequirement.max} image${imageRequirement.max === 1 ? "" : "s"}.`,
        );
      }

      this.submissionData = {
        ...this.submissionData,
        completedAt: new Date(),
      };
    }
  }

  // Validate the domains of the URLs
  private validateUrlDomains(
    urlRequirement: {
      domains?: string[] | null;
    } | null,
  ) {
    if (
      !urlRequirement?.domains ||
      urlRequirement.domains.length === 0 ||
      this.urls.length === 0
    ) {
      return;
    }

    const allowedDomains = urlRequirement.domains
      .map((domain) => getDomainWithoutWWW(domain)?.toLowerCase())
      .filter((domain): domain is string => !!domain);

    if (allowedDomains.length === 0) {
      return;
    }

    const invalidUrls = this.urls.filter((url) => {
      const urlDomain = getDomainWithoutWWW(url)?.toLowerCase();

      if (!urlDomain) {
        return true;
      }

      return !allowedDomains.some(
        (allowedDomain) =>
          urlDomain === allowedDomain ||
          urlDomain.endsWith(`.${allowedDomain}`),
      );
    });

    if (invalidUrls.length > 0) {
      const domainsList = allowedDomains.join(", ");

      throw new Error(
        `All URLs must be from one of the following domains: ${domainsList}. Please check your submission.`,
      );
    }
  }

  // Validate the social content of the submission
  private async validateSocialContent() {
    const bountyInfo = resolveBountyDetails(this.bounty);

    if (!bountyInfo?.socialMetrics) {
      return;
    }

    const contentUrl = this.urls[0];

    if (!bountyInfo.socialPlatform) {
      throw new Error("Invalid bounty platform.");
    }

    const platform = bountyInfo.socialPlatform;

    if (!contentUrl) {
      throw new Error(
        `You must provide a ${platform.label} URL to submit this bounty.`,
      );
    }

    const urlPlatform = getPlatformFromSocialUrl(contentUrl);

    if (urlPlatform !== platform.value) {
      throw new Error(
        `This link must be a ${platform.label} link. You submitted a link from another platform.`,
      );
    }

    const partnerPlatform = await prisma.partnerPlatform.findUnique({
      where: {
        partnerId_type: {
          partnerId: this.partner.id,
          type: platform.value,
        },
      },
      select: {
        identifier: true,
        verifiedAt: true,
      },
    });

    if (!partnerPlatform) {
      throw new Error(
        `You must connect your ${platform.label} account to your profile before submitting this bounty.`,
      );
    }

    if (!partnerPlatform.verifiedAt) {
      throw new Error(
        `You must verify your ${platform.label} account before submitting this bounty.`,
      );
    }

    const socialContent = await getSocialContent({
      platform: platform.value,
      url: contentUrl,
    });

    if (!socialContent.handle || !socialContent.publishedAt) {
      throw new Error(
        "We were unable to verify this content. Please review the submission and try again.",
      );
    }

    if (
      socialContent.handle.toLowerCase() !==
      partnerPlatform.identifier.toLowerCase()
    ) {
      throw new Error(
        `The content was not published from your connected ${platform.label} account.`,
      );
    }

    if (
      socialContent.publishedAt &&
      this.bounty.startsAt &&
      isBefore(socialContent.publishedAt, this.bounty.startsAt)
    ) {
      throw new Error(
        `This content was published before the bounty started. Please submit content posted after the start date.`,
      );
    }

    this.submissionData = {
      ...this.submissionData,
      status: "draft",
      completedAt: null,
    };

    const metricValue = socialContent[bountyInfo.socialMetrics!.metric];

    if (typeof metricValue === "number" && Number.isInteger(metricValue)) {
      this.submissionData = {
        ...this.submissionData,
        urls: [contentUrl],
        socialMetricCount: metricValue,
        socialMetricsLastSyncedAt: new Date(),
      };

      if (
        metricValue &&
        bountyInfo.socialMetrics!.minCount &&
        metricValue >= bountyInfo.socialMetrics!.minCount
      ) {
        this.submissionData.status = "submitted";
        this.submissionData.completedAt = new Date();
      }
    }
  }

  // Merge the submission data
  private mergeSubmissionData() {
    const bountyInfo = resolveBountyDetails(this.bounty);

    const submissionRequirements = submissionRequirementsSchema
      .nullable()
      .parse(this.bounty.submissionRequirements);

    const requireImage = !!submissionRequirements?.image;
    const requireUrl = !!submissionRequirements?.url;

    this.submissionData = {
      ...this.submissionData,
      ...(requireImage && { files: this.files }),
      ...(!bountyInfo?.hasSocialMetrics &&
        requireUrl && {
          urls: [...this.urls].slice(0, BOUNTY_MAX_SUBMISSION_URLS),
        }),
      ...(this.description !== undefined && { description: this.description }),
    };
  }

  // Persist the submission
  private async persist(): Promise<BountySubmission> {
    const existingSubmission = this.submissions.find(
      (s) => s.periodNumber === this.finalPeriodNumber,
    );

    if (existingSubmission) {
      return prisma.bountySubmission.update({
        where: {
          id: existingSubmission.id,
        },
        data: {
          ...this.submissionData,
        },
      });
    }

    return prisma.bountySubmission.create({
      data: {
        ...this.submissionData,
        id: createId({ prefix: "bnty_sub_" }),
        programId: this.bounty.programId,
        bountyId: this.bounty.id,
        partnerId: this.partner.id,
        periodNumber: this.finalPeriodNumber,
      },
    });
  }

  // Send notifications for the submission
  private sendNotifications(submission: BountySubmission) {
    const { partner, bounty } = this;
    const programId = this.programId;

    if (submission.status === "draft") {
      return;
    }

    waitUntil(
      (async () => {
        const { users, program, ...workspace } = await getWorkspaceUsers({
          programId,
          role: WorkspaceRole.owner,
          notificationPreference: "newBountySubmitted",
        });

        if (users.length > 0) {
          await sendBatchEmail(
            users.map((user) => ({
              variant: "notifications" as const,
              to: user.email,
              subject: "New bounty submission",
              react: NewBountySubmission({
                email: user.email,
                workspace: {
                  slug: workspace.slug,
                },
                bounty: {
                  id: bounty.id,
                  name: bounty.name,
                },
                partner: {
                  id: partner.id,
                  name: partner.name,
                  image: partner.image,
                  email: partner.email ?? "",
                },
                submission: {
                  id: submission.id,
                },
              }),
            })),
          );
        }

        if (partner.email && program) {
          await sendEmail({
            subject: "Bounty submitted!",
            to: partner.email,
            replyTo: program.supportEmail || "noreply",
            react: BountySubmitted({
              email: partner.email,
              bounty: {
                name: bounty.name,
              },
              program: {
                name: program.name,
                slug: program.slug,
              },
            }),
          });
        }
      })(),
    );
  }
}

function getPlatformFromSocialUrl(url: string): PlatformType | null {
  const trimmed = url?.trim();

  if (!trimmed || !isValidUrl(trimmed)) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, "");

    return SOCIAL_URL_HOST_TO_PLATFORM[host] ?? null;
  } catch {
    return null;
  }
}
