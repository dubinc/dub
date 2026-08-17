import { createId } from "@/lib/api/create-id";
import { DubApiError } from "@/lib/api/errors";
import { getWorkspaceUsers } from "@/lib/api/get-workspace-users";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { getSocialContent } from "@/lib/api/scrape-creators/get-social-content";
import {
  canPartnerSubmitBounty,
  getEffectiveBountyPeriod,
} from "@/lib/bounty/api/bounty-availability";
import { getBountyOrThrow } from "@/lib/bounty/api/get-bounty-or-throw";
import { BOUNTY_MAX_SUBMISSION_URLS } from "@/lib/bounty/constants";
import { addFrequency, getCurrentPeriodNumber } from "@/lib/bounty/periods";
import {
  formatSocialPlatformsList,
  resolveBountyDetails,
} from "@/lib/bounty/utils";
import { prisma } from "@/lib/prisma";
import {
  createBountySubmissionInputSchema,
  submissionRequirementsSchema,
} from "@/lib/zod/schemas/bounties";
import { sendBatchEmail, sendEmail } from "@dub/email";
import NewBountySubmission from "@dub/email/templates/bounty-new-submission";
import BountySubmitted from "@dub/email/templates/bounty-submitted";
import { getDomainWithoutWWW, R2_URL } from "@dub/utils";
import {
  BountySubmission,
  Partner,
  PlatformType,
  Prisma,
  WorkspaceRole,
} from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { formatDistanceToNow, isBefore } from "date-fns";
import * as z from "zod/v4";
import { getPlatformFromSocialUrl } from "../social-content";

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
    include: {
      program: {
        select: {
          id: true;
          defaultGroupId: true;
        };
      };
    };
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

    this.validateFiles();

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
        include: {
          program: {
            select: {
              id: true,
              defaultGroupId: true,
            },
          },
        },
      }),

      getBountyOrThrow({
        bountyId: this.bountyId,
        programId: this.programId,
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
        throw new DubApiError({
          code: "bad_request",
          message: "Period number is required for this bounty.",
        });
      }

      if (
        this.periodNumber < 1 ||
        this.periodNumber > this.bounty.maxSubmissions
      ) {
        throw new DubApiError({
          code: "bad_request",
          message: "Invalid submission period number.",
        });
      }

      this.finalPeriodNumber = this.periodNumber;
      return;
    }

    // Multi-submission WITH frequency — time-gated
    const { startsAt, endsAt } = getEffectiveBountyPeriod({
      programEnrollment: this.programEnrollment,
      bounty: this.bounty,
    });

    const currentPeriod = getCurrentPeriodNumber({
      startsAt,
      endsAt,
      submissionFrequency: this.bounty.submissionFrequency,
      maxSubmissions: this.bounty.maxSubmissions,
    });

    let periodNumber: number;

    if (this.periodNumber) {
      periodNumber = this.periodNumber;
    } else {
      if (!currentPeriod) {
        throw new DubApiError({
          code: "bad_request",
          message: "No active submission period for this bounty.",
        });
      }

      periodNumber = currentPeriod;
    }

    if (periodNumber < 1 || periodNumber > this.bounty.maxSubmissions) {
      throw new DubApiError({
        code: "bad_request",
        message: "Invalid submission period number.",
      });
    }

    // Validate the period has started
    const periodStart = addFrequency({
      date: startsAt,
      frequency: this.bounty.submissionFrequency,
      amount: periodNumber - 1,
    });

    if (new Date() < periodStart) {
      throw new DubApiError({
        code: "bad_request",
        message: "This submission period hasn't started yet.",
      });
    }

    if (currentPeriod && periodNumber < currentPeriod) {
      throw new DubApiError({
        code: "bad_request",
        message: "This submission period has already closed.",
      });
    }

    this.finalPeriodNumber = periodNumber;
  }

  // Validate the eligibility of the submission
  private validateEligibility() {
    if (
      !canPartnerSubmitBounty({
        program: this.programEnrollment.program,
        bounty: this.bounty,
        programEnrollment: this.programEnrollment,
      })
    ) {
      throw new DubApiError({
        code: "forbidden",
        message:
          "You are not allowed to submit this bounty. Please contact the program if you think this is an error.",
      });
    }

    // Check existing submission for this period
    const existingSubmission = this.submissions.find(
      (s) => s.periodNumber === this.finalPeriodNumber,
    );

    const bountyInfo = resolveBountyDetails(this.bounty);

    if (existingSubmission) {
      if (
        existingSubmission.status !== "draft" ||
        bountyInfo?.hasSocialMetrics
      ) {
        throw new DubApiError({
          code: "conflict",
          message: `You already have a ${existingSubmission.status} submission for this period.`,
        });
      }
    }

    if (this.bounty.type === "performance") {
      throw new DubApiError({
        code: "forbidden",
        message: "You are not allowed to submit a performance bounty.",
      });
    }

    const now = new Date();

    if (
      !this.isDraft &&
      this.bounty.submissionsOpenAt &&
      this.bounty.submissionsOpenAt > now
    ) {
      const waitTime = formatDistanceToNow(this.bounty.submissionsOpenAt, {
        addSuffix: true,
      });

      throw new DubApiError({
        code: "bad_request",
        message: `Submissions are not open yet. You can submit ${waitTime}.`,
      });
    }

    if (bountyInfo?.hasSocialMetrics && this.isDraft) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "Draft submissions are not allowed for social metrics bounties.",
      });
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
        throw new DubApiError({
          code: "unprocessable_entity",
          message: "You must submit an image.",
        });
      }

      if (requireUrl && this.urls.length === 0) {
        throw new DubApiError({
          code: "unprocessable_entity",
          message: "You must submit a URL.",
        });
      }

      this.validateUrlDomains(urlRequirement);

      // Validate max count for URLs
      if (urlRequirement?.max && this.urls.length > urlRequirement.max) {
        throw new DubApiError({
          code: "unprocessable_entity",
          message: `You can submit at most ${urlRequirement.max} URL${urlRequirement.max === 1 ? "" : "s"}.`,
        });
      }

      // Validate max count for images
      if (imageRequirement?.max && this.files.length > imageRequirement.max) {
        throw new DubApiError({
          code: "unprocessable_entity",
          message: `You can submit at most ${imageRequirement.max} image${imageRequirement.max === 1 ? "" : "s"}.`,
        });
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

      throw new DubApiError({
        code: "unprocessable_entity",
        message: `All URLs must be from one of the following domains: ${domainsList}. Please check your submission.`,
      });
    }
  }

  private validateFiles() {
    if (this.files.length === 0) {
      return;
    }

    // Validate the URL to the partner's own upload location in R2
    const r2 = new URL(R2_URL);
    const expectedPath = `/programs/${this.programId}/bounties/${this.bountyId}/submissions/${this.partner.id}/`;

    for (const file of this.files) {
      const parsed = new URL(file.url);

      if (
        parsed.origin !== r2.origin ||
        !parsed.pathname.startsWith(expectedPath)
      ) {
        throw new DubApiError({
          code: "unprocessable_entity",
          message: "Invalid file URL.",
        });
      }
    }
  }

  // Validate the social content of the submission
  private async validateSocialContent() {
    const bountyInfo = resolveBountyDetails(this.bounty);

    if (!bountyInfo?.socialMetrics) {
      return;
    }

    const { logic, minCount, metric } = bountyInfo.socialMetrics;
    const platforms = bountyInfo.socialPlatforms;

    if (platforms.length === 0) {
      throw new DubApiError({
        code: "bad_request",
        message: "Invalid bounty platform.",
      });
    }

    // AND only makes sense with 2+ platforms — otherwise behaves like OR
    const isAnd = logic === "AND" && platforms.length > 1;
    const platformsList = formatSocialPlatformsList(platforms, logic);

    const submittedUrls = this.urls.filter(Boolean);

    if (submittedUrls.length === 0) {
      throw new DubApiError({
        code: "unprocessable_entity",
        message: isAnd
          ? `You must provide a link for each of: ${platforms.map((p) => p.label).join(", ")}.`
          : `You must provide a ${platformsList} URL to submit this bounty.`,
      });
    }

    const detectedUrls = submittedUrls.map((url) => ({
      url,
      platform: getPlatformFromSocialUrl(url),
    }));

    const unmatchedUrls = detectedUrls.filter(
      ({ platform }) =>
        !platform || !platforms.some((p) => p.value === platform),
    );

    if (unmatchedUrls.length > 0) {
      throw new DubApiError({
        code: "unprocessable_entity",
        message:
          platforms.length > 1
            ? `Each link must be from one of: ${platforms.map((p) => p.label).join(", ")}.`
            : `This link must be a ${platforms[0].label} link. You submitted a link from another platform.`,
      });
    }

    // OR: only the first submitted (and matched) URL is considered.
    // AND: resolve at most one URL per required platform (first match wins).
    const pendingChecks: { platform: string; label: string; url: string }[] =
      isAnd
        ? platforms.flatMap((platform) => {
            const match = detectedUrls.find(
              (d) => d.platform === platform.value,
            );

            return match
              ? [
                  {
                    platform: platform.value,
                    label: platform.label,
                    url: match.url,
                  },
                ]
              : [];
          })
        : [
            {
              platform: detectedUrls[0].platform!,
              label: platforms.find(
                (p) => p.value === detectedUrls[0].platform,
              )!.label,
              url: detectedUrls[0].url,
            },
          ];

    if (isAnd && pendingChecks.length < platforms.length) {
      const missing = platforms.filter(
        (p) => !pendingChecks.some((c) => c.platform === p.value),
      );

      throw new DubApiError({
        code: "unprocessable_entity",
        message: `You must provide a link for each of: ${missing.map((p) => p.label).join(", ")}.`,
      });
    }

    const results: {
      platform: string;
      url: string;
      metricCount: number | null;
      meetsCriteria: boolean;
    }[] = [];

    for (const check of pendingChecks) {
      const partnerPlatform = await prisma.partnerPlatform.findUnique({
        where: {
          partnerId_type: {
            partnerId: this.partner.id,
            type: check.platform as PlatformType,
          },
        },
        select: {
          identifier: true,
          verifiedAt: true,
        },
      });

      if (!partnerPlatform) {
        throw new DubApiError({
          code: "unprocessable_entity",
          message: `You must connect your ${check.label} account to your profile before submitting this bounty.`,
        });
      }

      if (!partnerPlatform.verifiedAt) {
        throw new DubApiError({
          code: "unprocessable_entity",
          message: `You must verify your ${check.label} account before submitting this bounty.`,
        });
      }

      const socialContent = await getSocialContent({
        platform: check.platform as PlatformType,
        url: check.url,
      });

      if (!socialContent.handle || !socialContent.publishedAt) {
        throw new DubApiError({
          code: "unprocessable_entity",
          message:
            "We were unable to verify this content. Please review the submission and try again.",
        });
      }

      if (
        socialContent.handle.toLowerCase() !==
        partnerPlatform.identifier.toLowerCase()
      ) {
        throw new DubApiError({
          code: "unprocessable_entity",
          message: `The content was not published from your connected ${check.label} account.`,
        });
      }

      if (socialContent.publishedAt) {
        const { startsAt } = getEffectiveBountyPeriod({
          programEnrollment: this.programEnrollment,
          bounty: this.bounty,
        });

        if (isBefore(socialContent.publishedAt, startsAt)) {
          throw new DubApiError({
            code: "unprocessable_entity",
            message:
              "This content was published before the bounty started. Please submit content posted after the start date.",
          });
        }
      }

      const metricValue = socialContent[metric];
      const metricCount =
        typeof metricValue === "number" && Number.isInteger(metricValue)
          ? metricValue
          : null;

      results.push({
        platform: check.platform,
        url: check.url,
        metricCount,
        meetsCriteria:
          metricCount != null && !!minCount && metricCount >= minCount,
      });
    }

    const hasAllRequiredPlatforms = isAnd
      ? platforms.every((p) => results.some((r) => r.platform === p.value))
      : results.length > 0;

    const validCounts = results
      .map((r) => r.metricCount)
      .filter((c): c is number => c != null);

    const aggregateMetricCount =
      isAnd && hasAllRequiredPlatforms && validCounts.length === results.length
        ? Math.min(...validCounts)
        : !isAnd
          ? results[0]?.metricCount ?? null
          : null;

    const hasMetCriteria =
      hasAllRequiredPlatforms &&
      aggregateMetricCount != null &&
      !!minCount &&
      aggregateMetricCount >= minCount;

    this.submissionData = {
      ...this.submissionData,
      status: "draft",
      completedAt: null,
      urls: pendingChecks.map((c) => c.url),
      socialMetricResults: results,
      socialMetricCount: aggregateMetricCount,
      socialMetricsLastSyncedAt: new Date(),
    };

    if (hasMetCriteria) {
      this.submissionData.status = "submitted";
      this.submissionData.completedAt = new Date();
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
