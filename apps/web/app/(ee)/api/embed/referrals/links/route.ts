import { DubApiError, ErrorCodes } from "@/lib/api/errors";
import { createLink, processLink } from "@/lib/api/links";
import { validatePartnerLinkUrl } from "@/lib/api/links/validate-partner-link-url";
import { parseRequestBody } from "@/lib/api/utils";
import { withReferralsEmbedToken } from "@/lib/embed/referrals/auth";
import { createPartnerLinkSchema } from "@/lib/zod/schemas/partners";
import { ReferralsEmbedLinkSchema } from "@/lib/zod/schemas/referrals-embed";
import { prisma } from "@dub/prisma";
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

    if (programEnrollment.status === "banned") {
      throw new DubApiError({
        code: "forbidden",
        message: "You are banned from this program hence cannot create links.",
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

    const [workspaceOwner, utmTemplate] = await Promise.all([
      prisma.projectUsers.findFirst({
        where: {
          projectId: program.workspaceId,
          role: "owner",
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      group.utmTemplateId
        ? prisma.utmTemplate.findUnique({
            where: {
              id: group.utmTemplateId,
            },
          })
        : Promise.resolve(null),
    ]);

    const { link, error, code } = await processLink({
      payload: {
        key: key || undefined,
        url: url || program.url,
        domain: program.domain,
        programId: program.id,
        folderId: program.defaultFolderId,
        tenantId: programEnrollment.tenantId,
        partnerId: programEnrollment.partnerId,
        trackConversion: true,
        utm_source: utmTemplate?.utm_source,
        utm_medium: utmTemplate?.utm_medium,
        utm_campaign: utmTemplate?.utm_campaign,
        utm_term: utmTemplate?.utm_term,
        utm_content: utmTemplate?.utm_content,
        ref: utmTemplate?.ref,
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

    const partnerLink = await createLink({
      ...link,
      workspace: workspaceOwner?.project,
      discount,
    });

    return NextResponse.json(ReferralsEmbedLinkSchema.parse(partnerLink), {
      status: 201,
    });
  },
);
