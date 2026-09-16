import { trackLinkRewardOverrideLog } from "@/lib/api/activity-log/track-reward-overrides";
import { DubApiError, ErrorCodes } from "@/lib/api/errors";
import { createLink, processLink } from "@/lib/api/links";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import {
  getRewardIds,
  hasRewardAssignment,
  hasRewardIdsInput,
  LinkRewardIdsInput,
  throwIfInvalidRewardIds,
} from "@/lib/api/rewards/additional-rewards";
import { parseRequestBody } from "@/lib/api/utils";
import { applyGroupUtmToLink } from "@/lib/api/utm/apply-group-utm-to-link";
import { withWorkspace } from "@/lib/auth";
import { throwIfNoPartnerIdOrTenantId } from "@/lib/partners/throw-if-no-partnerid-tenantid";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { prisma } from "@/lib/prisma";
import { PARTNER_AND_LINK_REWARDS_PLAN_ERROR } from "@/lib/rewards/constants";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { linkEventSchema } from "@/lib/zod/schemas/links";
import {
  createPartnerLinkSchema,
  retrievePartnerLinksSchema,
} from "@/lib/zod/schemas/partners";
import { ProgramPartnerLinkSchema } from "@/lib/zod/schemas/programs";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/partners/links - get the partner links
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { partnerId, tenantId } =
      retrievePartnerLinksSchema.parse(searchParams);

    throwIfNoPartnerIdOrTenantId({ partnerId, tenantId });

    const programEnrollment = await prisma.programEnrollment.findUnique({
      where: partnerId
        ? {
            partnerId_programId: {
              partnerId,
              programId,
            },
          }
        : {
            tenantId_programId: {
              tenantId: tenantId as string,
              programId,
            },
          },
      select: {
        links: {
          include: {
            linkReward: true,
          },
        },
      },
    });

    if (!programEnrollment) {
      throw new DubApiError({
        code: "not_found",
        message: "Partner not found.",
      });
    }

    const links = programEnrollment.links.map((link) => ({
      ...link,
      ...getRewardIds(link.linkReward),
    }));

    return NextResponse.json(z.array(ProgramPartnerLinkSchema).parse(links));
  },
  {
    requiredPlan: ["business", "advanced", "enterprise"],
    requiredRoles: ["owner", "member"],
  },
);

// POST /api/partners/links - create a link for a partner
export const POST = withWorkspace(
  async ({ workspace, req, session }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const {
      partnerId,
      tenantId,
      url,
      key,
      linkProps,
      clickRewardId,
      leadRewardId,
      saleRewardId,
      discountId,
    } = createPartnerLinkSchema.parse(await parseRequestBody(req));

    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    if (!program.domain || !program.url) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "You need to set a domain and url for this program before creating a link.",
      });
    }

    throwIfNoPartnerIdOrTenantId({ partnerId, tenantId });

    const partner = await prisma.programEnrollment.findUnique({
      where: partnerId
        ? { partnerId_programId: { partnerId, programId } }
        : { tenantId_programId: { tenantId: tenantId!, programId } },
      select: {
        tenantId: true,
        partnerId: true,
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
      },
    });

    if (!partner) {
      throw new DubApiError({
        code: "not_found",
        message: "Partner not found.",
      });
    }

    const partnerGroup = partner.partnerGroup;

    // shouldn't happen but just in case
    if (!partnerGroup) {
      throw new DubApiError({
        code: "not_found",
        message: "This partner is not part of a partner group.",
      });
    }

    const linkUrl = url || partnerGroup.partnerGroupDefaultLinks[0].url;

    const { link, error, code } = await processLink({
      payload: {
        ...linkProps,
        domain: program.domain,
        key: key || undefined,
        url: linkUrl,
        programId: program.id,
        tenantId: partner.tenantId,
        partnerId: partner.partnerId,
        folderId: program.defaultFolderId,
        trackConversion: true,
      },
      workspace,
      userId: session.user.id,
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
      partnerName: partner.partner.name,
    });

    // Validate link level rewards
    const linkRewardInput: LinkRewardIdsInput = {
      clickRewardId,
      leadRewardId,
      saleRewardId,
      discountId,
    };

    const hasLinkLevelReward = hasRewardIdsInput(linkRewardInput);

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
      programId,
      groupId: partnerGroup.id,
      ...linkRewardInput,
    });

    const partnerLink = await createLink({
      ...linkWithUtm,
      linkReward: linkRewardInput,
    });

    const response = {
      ...partnerLink,
      ...getRewardIds(linkRewardInput),
    };

    waitUntil(
      Promise.allSettled([
        sendWorkspaceWebhook({
          trigger: "link.created",
          workspace,
          data: linkEventSchema.parse(partnerLink),
        }),
        ...(hasLinkLevelReward
          ? [
              trackLinkRewardOverrideLog({
                workspaceId: workspace.id,
                programId: program.id,
                partnerId: partner.partnerId,
                userId: session.user.id,
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

    return NextResponse.json(response, { status: 201 });
  },
  {
    requiredPlan: ["business", "advanced", "enterprise"],
    requiredRoles: ["owner", "member"],
  },
);
