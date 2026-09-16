import { trackLinkRewardOverrideLog } from "@/lib/api/activity-log/track-reward-overrides";
import { DubApiError, ErrorCodes } from "@/lib/api/errors";
import {
  createLink,
  processLink,
  transformLink,
  updateLink,
} from "@/lib/api/links";
import { includeTags } from "@/lib/api/links/include-tags";
import { updatePartnerLink } from "@/lib/api/partners/update-partner-link";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import {
  getRewardIds,
  hasRewardAssignment,
  hasRewardIdsInput,
  throwIfInvalidRewardIds,
} from "@/lib/api/rewards/additional-rewards";
import { applyGroupUtmToLink } from "@/lib/api/utm/apply-group-utm-to-link";
import { throwIfNoPartnerIdOrTenantId } from "@/lib/partners/throw-if-no-partnerid-tenantid";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { prisma } from "@/lib/prisma";
import { PARTNER_AND_LINK_REWARDS_PLAN_ERROR } from "@/lib/rewards/constants";
import { NewLinkProps, ProgramProps, WorkspaceProps } from "@/lib/types";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { linkEventSchema } from "@/lib/zod/schemas/links";
import { upsertPartnerLinkSchema } from "@/lib/zod/schemas/partners";
import { deepEqual } from "@dub/utils";
import { Prisma } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";

const upsertPartnerEnrollmentInclude = {
  partner: {
    select: {
      name: true,
    },
  },
  partnerGroup: {
    include: {
      partnerGroupDefaultLinks: true,
      utmTemplate: true,
    },
  },
} satisfies Prisma.ProgramEnrollmentInclude;

const existingPartnerLinkInclude = {
  ...includeTags,
  linkReward: true,
} satisfies Prisma.LinkInclude;

type UpsertPartnerEnrollment = Prisma.ProgramEnrollmentGetPayload<{
  include: typeof upsertPartnerEnrollmentInclude;
}>;

type ExistingPartnerLink = Prisma.LinkGetPayload<{
  include: typeof existingPartnerLinkInclude;
}>;

type UpsertPartnerLinkBody = z.infer<typeof upsertPartnerLinkSchema>;

type PartnerLinkRewardInput = Pick<
  UpsertPartnerLinkBody,
  "clickRewardId" | "leadRewardId" | "saleRewardId" | "discountId"
>;

type UpsertPartnerLinkWorkspace = Pick<
  WorkspaceProps,
  "id" | "plan" | "webhookEnabled" | "users"
>;

type UpsertPartnerLinkParams = {
  workspace: UpsertPartnerLinkWorkspace;
  programId: string;
  userId: string;
} & UpsertPartnerLinkBody;

type ProgramForPartnerLink = Pick<ProgramProps, "id" | "defaultFolderId"> & {
  domain: NonNullable<ProgramProps["domain"]>;
};

type UpsertPartnerLinkBranchParams = {
  workspace: UpsertPartnerLinkWorkspace;
  program: ProgramForPartnerLink;
  enrollment: UpsertPartnerEnrollment;
  partnerGroup: NonNullable<UpsertPartnerEnrollment["partnerGroup"]>;
  userId: string;
  body: UpsertPartnerLinkBody;
  linkRewardInput: PartnerLinkRewardInput;
};

export async function upsertPartnerLink({
  workspace,
  programId,
  userId,
  ...body
}: UpsertPartnerLinkParams) {
  const {
    partnerId,
    tenantId,
    url,
    clickRewardId,
    leadRewardId,
    saleRewardId,
    discountId,
  } = body;

  throwIfNoPartnerIdOrTenantId({
    partnerId,
    tenantId,
  });

  const program = await getProgramOrThrow({
    workspaceId: workspace.id,
    programId,
  });

  if (!program.domain || !program.url) {
    throw new DubApiError({
      code: "bad_request",
      message:
        "You need to set a domain and url for this program before upserting a partner link.",
    });
  }

  const enrollment = await prisma.programEnrollment.findUnique({
    where: partnerId
      ? {
          partnerId_programId: {
            partnerId,
            programId,
          },
        }
      : {
          tenantId_programId: {
            tenantId: tenantId!,
            programId,
          },
        },
    include: upsertPartnerEnrollmentInclude,
  });

  if (!enrollment) {
    throw new DubApiError({
      code: "not_found",
      message: "Partner not found.",
    });
  }

  const partnerGroup = enrollment.partnerGroup;

  if (!partnerGroup) {
    throw new DubApiError({
      code: "not_found",
      message: "This partner is not part of a partner group.",
    });
  }

  const existingLink = await prisma.link.findFirst({
    where: {
      programId,
      partnerId: enrollment.partnerId,
      projectId: workspace.id,
      url,
    },
    include: existingPartnerLinkInclude,
  });

  const params: UpsertPartnerLinkBranchParams = {
    workspace,
    program: {
      id: program.id,
      domain: program.domain,
      defaultFolderId: program.defaultFolderId,
    },
    enrollment,
    partnerGroup,
    userId,
    body,
    linkRewardInput: {
      clickRewardId,
      leadRewardId,
      saleRewardId,
      discountId,
    },
  };

  if (existingLink) {
    return updateExistingPartnerLink({
      ...params,
      existingLink,
    });
  }

  return createNewPartnerLink(params);
}

async function updateExistingPartnerLink({
  workspace,
  program,
  enrollment,
  partnerGroup,
  userId,
  body,
  linkRewardInput,
  existingLink,
}: UpsertPartnerLinkBranchParams & {
  existingLink: ExistingPartnerLink;
}) {
  const { url, key, linkProps } = body;

  const { linkReward: existingLinkReward, ...existingLinkWithoutReward } =
    existingLink;

  const updatedLink = {
    // original link
    ...existingLinkWithoutReward,
    // coerce types
    expiresAt:
      existingLink.expiresAt instanceof Date
        ? existingLink.expiresAt.toISOString()
        : existingLink.expiresAt,
    geo: existingLink.geo as NewLinkProps["geo"],
    testVariants: existingLink.testVariants as NewLinkProps["testVariants"],
    testCompletedAt:
      existingLink.testCompletedAt instanceof Date
        ? existingLink.testCompletedAt.toISOString()
        : existingLink.testCompletedAt,
    testStartedAt:
      existingLink.testStartedAt instanceof Date
        ? existingLink.testStartedAt.toISOString()
        : existingLink.testStartedAt,
    ...linkProps,
    domain: program.domain,
    ...(key && { key }),
    url,
    programId: program.id,
    tenantId: enrollment.tenantId,
    partnerId: enrollment.partnerId,
    folderId: program.defaultFolderId,
    trackConversion: true,
  };

  const shouldUpdateRewards = hasRewardIdsInput(linkRewardInput);
  const linkUnchanged = deepEqual(existingLinkWithoutReward, updatedLink);

  // if link and updatedLink are identical, return the link
  if (linkUnchanged && !shouldUpdateRewards) {
    return {
      ...transformLink(existingLinkWithoutReward),
      ...getRewardIds(existingLinkReward),
    };
  }

  let response = transformLink(existingLinkWithoutReward);

  if (!linkUnchanged) {
    // if domain and key are the same, we don't need to check if the key exists
    const skipKeyChecks =
      existingLink.domain === updatedLink.domain &&
      existingLink.key.toLowerCase() === updatedLink.key?.toLowerCase();

    // if externalId is the same, we don't need to check if it exists
    const skipExternalIdChecks =
      existingLink.externalId?.toLowerCase() ===
      updatedLink.externalId?.toLowerCase();

    const {
      link: processedLink,
      error,
      code,
    } = await processLink({
      payload: {
        ...updatedLink,
        tags: undefined,
      },
      workspace,
      skipKeyChecks,
      skipExternalIdChecks,
      userId,
    });

    if (error) {
      throw new DubApiError({
        code: code as ErrorCodes,
        message: error,
      });
    }

    const linkWithUtm = applyGroupUtmToLink({
      link: processedLink,
      utmTemplate: partnerGroup.utmTemplate,
      partnerName: enrollment.partner.name,
    });

    try {
      response = await updateLink({
        oldLink: {
          domain: existingLink.domain,
          key: existingLink.key,
          image: existingLink.image,
          programId: existingLink.programId,
          partnerId: existingLink.partnerId,
        },
        updatedLink: linkWithUtm,
      });

      waitUntil(
        sendWorkspaceWebhook({
          trigger: "link.updated",
          workspace,
          data: linkEventSchema.parse(response),
        }),
      );
    } catch (error) {
      throw new DubApiError({
        code: "unprocessable_entity",
        message: error.message,
      });
    }
  }

  if (shouldUpdateRewards) {
    const updatedPartnerLink = await updatePartnerLink({
      workspace,
      programId: program.id,
      linkId: existingLink.id,
      userId,
      ...linkRewardInput,
    });

    return {
      ...response,
      clickReward: updatedPartnerLink.clickReward,
      leadReward: updatedPartnerLink.leadReward,
      saleReward: updatedPartnerLink.saleReward,
      discount: updatedPartnerLink.discount,
    };
  }

  return {
    ...response,
    ...getRewardIds(existingLinkReward),
  };
}

async function createNewPartnerLink({
  workspace,
  program,
  enrollment,
  partnerGroup,
  userId,
  body,
  linkRewardInput,
}: UpsertPartnerLinkBranchParams) {
  const { url, key, linkProps } = body;
  const linkUrl = url || partnerGroup.partnerGroupDefaultLinks[0].url;

  const { link, error, code } = await processLink({
    payload: {
      ...linkProps,
      domain: program.domain,
      key: key || undefined,
      url: linkUrl,
      programId: program.id,
      tenantId: enrollment.tenantId,
      partnerId: enrollment.partnerId,
      folderId: program.defaultFolderId,
      trackConversion: true,
    },
    workspace,
    userId,
    skipProgramChecks: true, // skip this cause we've already validated the program above
  });

  if (error != null) {
    throw new DubApiError({
      code: code as ErrorCodes,
      message: error,
    });
  }

  const linkWithUtm = applyGroupUtmToLink({
    link,
    utmTemplate: partnerGroup.utmTemplate,
    partnerName: enrollment.partner.name,
  });

  if (
    hasRewardAssignment(linkRewardInput) &&
    !getPlanCapabilities(workspace.plan).canUseAdvancedRewardLogic
  ) {
    throw new DubApiError({
      code: "forbidden",
      message: PARTNER_AND_LINK_REWARDS_PLAN_ERROR,
    });
  }

  await throwIfInvalidRewardIds({
    programId: program.id,
    groupId: partnerGroup.id,
    ...linkRewardInput,
  });

  const partnerLink = await createLink({
    ...linkWithUtm,
    linkReward: linkRewardInput,
  });

  waitUntil(
    Promise.allSettled([
      sendWorkspaceWebhook({
        trigger: "link.created",
        workspace,
        data: linkEventSchema.parse(partnerLink),
      }),
      ...(hasRewardIdsInput(linkRewardInput)
        ? [
            trackLinkRewardOverrideLog({
              workspaceId: workspace.id,
              programId: program.id,
              partnerId: enrollment.partnerId,
              userId,
              previous: {
                clickRewardId: null,
                leadRewardId: null,
                saleRewardId: null,
                discountId: null,
              },
              next: {
                clickRewardId: linkRewardInput.clickRewardId ?? null,
                leadRewardId: linkRewardInput.leadRewardId ?? null,
                saleRewardId: linkRewardInput.saleRewardId ?? null,
                discountId: linkRewardInput.discountId ?? null,
              },
              link: partnerLink,
            }),
          ]
        : []),
    ]),
  );

  return {
    ...partnerLink,
    ...getRewardIds(linkRewardInput),
  };
}
