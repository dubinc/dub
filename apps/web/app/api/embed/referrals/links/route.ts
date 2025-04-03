import { DubApiError, ErrorCodes } from "@/lib/api/errors";
import { createLink, processLink } from "@/lib/api/links";
import { parseRequestBody } from "@/lib/api/utils";
import { withReferralsEmbedToken } from "@/lib/embed/referrals/auth";
import { LinkSchema } from "@/lib/zod/schemas/links";
import { createPartnerLinkSchema } from "@/lib/zod/schemas/partners";
import { getApexDomain } from "@dub/utils";
import { NextResponse } from "next/server";

// TODO: Move this to a constant
const PARTNER_LINKS_LIMIT = 5;

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

    // TODO:
    // Under which workspace user the link should be created?

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
      userId: "cm1ypncqa0000tc44pfgxp6qs", //session.user.id,
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

    const partnerLink = LinkSchema.pick({
      id: true,
      domain: true,
      key: true,
      url: true,
    }).parse(await createLink(link));

    return NextResponse.json(partnerLink, { status: 201 });
  },
);
