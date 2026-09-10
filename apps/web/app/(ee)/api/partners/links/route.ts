import { DubApiError, ErrorCodes } from "@/lib/api/errors";
import { createLink, processLink } from "@/lib/api/links";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import {
  getExpandableRewardReferences,
  getLinkRewardIds,
  hasRewardIdsInput,
  LinkRewardIdsInput,
  validateRewardIds,
} from "@/lib/api/rewards/link-level-rewards";
import { parseRequestBody } from "@/lib/api/utils";
import { parseExpandFields } from "@/lib/expand/parse-expand-fields";
import { applyGroupUtmToLink } from "@/lib/api/utm/apply-group-utm-to-link";
import { withWorkspace } from "@/lib/auth";
import { throwIfNoPartnerIdOrTenantId } from "@/lib/partners/throw-if-no-partnerid-tenantid";
import { prisma } from "@/lib/prisma";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { linkEventSchema } from "@/lib/zod/schemas/links";
import {
  createPartnerLinkSchema,
  PARTNER_LINK_EXPAND_FIELDS,
  retrievePartnerLinksSchema,
} from "@/lib/zod/schemas/partners";
import { ProgramPartnerLinkSchema } from "@/lib/zod/schemas/programs";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/partners/links - get the partner links
export const GET = withWorkspace(
  async ({ workspace, searchParams, req }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { partnerId, tenantId } =
      retrievePartnerLinksSchema.parse(searchParams);

    const expandFields = parseExpandFields({
      url: req.url,
      allowedFields: PARTNER_LINK_EXPAND_FIELDS,
    });

    const expandReward = expandFields.has("reward");

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
            linkReward: expandReward
              ? {
                  include: {
                    clickReward: true,
                    leadReward: true,
                    saleReward: true,
                  },
                }
              : true,
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
      ...getExpandableRewardReferences({
        linkReward: link.linkReward,
        expand: expandReward,
      }),
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

    const linkRewardInput: LinkRewardIdsInput = {
      clickRewardId,
      leadRewardId,
      saleRewardId,
    };

    const hasLinkLevelReward = hasRewardIdsInput(linkRewardInput);

    if (hasLinkLevelReward) {
      await validateRewardIds({
        programId,
        ...linkRewardInput,
      });
    }

    const partnerLink = await createLink({
      ...linkWithUtm,
      linkReward: hasLinkLevelReward ? linkRewardInput : undefined,
    });

    const response = {
      ...partnerLink,
      ...getLinkRewardIds(hasLinkLevelReward ? linkRewardInput : null),
    };

    waitUntil(
      sendWorkspaceWebhook({
        trigger: "link.created",
        workspace,
        data: linkEventSchema.parse(partnerLink),
      }),
    );

    return NextResponse.json(response, { status: 201 });
  },
  {
    requiredPlan: ["business", "advanced", "enterprise"],
    requiredRoles: ["owner", "member"],
  },
);
