import { DubApiError, ErrorCodes } from "@/lib/api/errors";
import { createLink, processLink } from "@/lib/api/links";
import { validatePartnerLinkUrl } from "@/lib/api/links/validate-partner-link-url";
import { parseRequestBody } from "@/lib/api/utils";
import { extractUtmParams } from "@/lib/api/utm/extract-utm-params";
import { withReferralsEmbedToken } from "@/lib/embed/referrals/auth";
import { createPartnerLinkSchema } from "@/lib/zod/schemas/partners";
import { ReferralsEmbedLinkSchema } from "@/lib/zod/schemas/referrals-embed";
import { prisma } from "@dub/prisma";
import { constructURLFromUTMParams } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/embed/referrals/links – get links for a partner
export const GET = withReferralsEmbedToken(async ({ links }) => {
  const partnerLinks = ReferralsEmbedLinkSchema.array().parse(links);

  return NextResponse.json(partnerLinks);
});

// POST /api/embed/referrals/links – create links for a partner
export const POST = withReferralsEmbedToken(
  async ({ req, programEnrollment, program, links, group }) => {
    const { url, key } = createPartnerLinkSchema
      .pick({ url: true, key: true })
      .parse(await parseRequestBody(req));

    if (["banned", "deactivated"].includes(programEnrollment.status)) {
      throw new DubApiError({
        code: "forbidden",
        message: `You are ${programEnrollment.status} from this program hence cannot create links.`,
      });
    }

    if (!program.domain || !program.url) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "This program needs a domain and URL set before creating a link.",
      });
    }

    if (links.length >= group.maxPartnerLinks) {
      throw new DubApiError({
        code: "bad_request",
        message: `You have reached the limit of ${group.maxPartnerLinks} program links.`,
      });
    }

    validatePartnerLinkUrl({ group, url });

    const [workspaceOwner, partnerGroup] = await Promise.all([
      prisma.projectUsers.findFirst({
        where: {
          projectId: program.workspaceId,
          role: "owner",
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.partnerGroup.findUnique({
        where: {
          id: group.id,
        },
        include: {
          partnerGroupDefaultLinks: true,
          utmTemplate: true,
        },
      }),
    ]);

    // shouldn't happen but just in case
    if (!partnerGroup) {
      throw new DubApiError({
        code: "not_found",
        message: "This partner is not part of a partner group.",
      });
    }

    const { link, error, code } = await processLink({
      payload: {
        key: key || undefined,
        url: constructURLFromUTMParams(
          url || partnerGroup.partnerGroupDefaultLinks[0].url,
          extractUtmParams(partnerGroup.utmTemplate),
        ),
        ...extractUtmParams(partnerGroup.utmTemplate, { excludeRef: true }),
        domain: program.domain,
        programId: program.id,
        folderId: program.defaultFolderId,
        tenantId: programEnrollment.tenantId,
        partnerId: programEnrollment.partnerId,
        trackConversion: true,
      },
      workspace: {
        id: program.workspaceId,
        plan: "business",
      },
      userId: workspaceOwner?.userId,
      skipFolderChecks: true, // can't be changed by the partner
      skipProgramChecks: true, // can't be changed by the partner
      skipExternalIdChecks: true, // can't be changed by the partner
    });

    if (error != null) {
      throw new DubApiError({
        code: code as ErrorCodes,
        message: error,
      });
    }

    const partnerLink = await createLink(link);

    return NextResponse.json(ReferralsEmbedLinkSchema.parse(partnerLink), {
      status: 201,
    });
  },
);
