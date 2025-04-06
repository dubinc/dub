import { DubApiError, ErrorCodes } from "@/lib/api/errors";
import { createLink, processLink } from "@/lib/api/links";
import { parseRequestBody } from "@/lib/api/utils";
import { PARTNER_LINKS_LIMIT } from "@/lib/embed/constants";
import { withReferralsEmbedToken } from "@/lib/embed/referrals/auth";
import { createPartnerLinkSchema } from "@/lib/zod/schemas/partners";
import { ReferralsEmbedLinkSchema } from "@/lib/zod/schemas/referrals-embed";
import { getApexDomain } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/embed/referrals/links – get links for a partner
export const GET = withReferralsEmbedToken(async ({ links }) => {
  const partnerLinks = ReferralsEmbedLinkSchema.array().parse(links);

  return NextResponse.json(partnerLinks);
});

// TODO:
// Under which workspace user the link should be created? 

// POST /api/embed/referrals/links – create links for a partner
export const POST = withReferralsEmbedToken(
  async ({ req, programEnrollment, program, links }) => {
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

    if (links.length >= PARTNER_LINKS_LIMIT) {
      throw new DubApiError({
        code: "bad_request",
        message: `You have reached the limit of ${PARTNER_LINKS_LIMIT} program links.`,
      });
    }

    if (url && getApexDomain(url) !== getApexDomain(program.url)) {
      throw new DubApiError({
        code: "bad_request",
        message: `The provided URL domain (${getApexDomain(url)}) does not match the program's domain (${getApexDomain(program.url)}).`,
      });
    }

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
      },
      workspace: {
        id: program.workspaceId,
        plan: "business",
      },
      //  userId: session.user.id,
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
    const createdLink = ReferralsEmbedLinkSchema.parse(partnerLink);

    return NextResponse.json(createdLink, { status: 201 });
  },
);
