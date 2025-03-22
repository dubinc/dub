import { DubApiError, ErrorCodes } from "@/lib/api/errors";
import { createLink, processLink } from "@/lib/api/links";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withPartnerProfile } from "@/lib/auth/partner";
import { PartnerProfileLinkSchema } from "@/lib/zod/schemas/partner-profile";
import { createPartnerLinkSchema } from "@/lib/zod/schemas/partners";
import { getApexDomain } from "@dub/utils";
import { NextResponse } from "next/server";

const PARTNER_LINKS_LIMIT = 5;

// GET /api/partner-profile/programs/[programId]/links - get a partner's links in a program
export const GET = withPartnerProfile(async ({ partner, params }) => {
  const { links } = await getProgramEnrollmentOrThrow({
    partnerId: partner.id,
    programId: params.programId,
  });

  return NextResponse.json(
    links.map((link) => PartnerProfileLinkSchema.parse(link)),
  );
});

// POST /api/partner-profile/[programId]/links - create a link for a partner
export const POST = withPartnerProfile(
  async ({ partner, params, req, session }) => {
    const { url, key, comments } = createPartnerLinkSchema
      .pick({ url: true, key: true, comments: true })
      .parse(await parseRequestBody(req));

    const { program, links, tenantId, status } =
      await getProgramEnrollmentOrThrow({
        partnerId: partner.id,
        programId: params.programId,
      });

    if (status === "banned") {
      throw new DubApiError({
        code: "forbidden",
        message: "You are banned from this program.",
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
        domain: program.domain,
        key: key || undefined,
        url: url || program.url,
        programId: program.id,
        tenantId,
        partnerId: partner.id,
        folderId: program.defaultFolderId,
        comments,
        trackConversion: true,
      },
      workspace: {
        id: program.workspaceId,
        plan: "business",
      },
      userId: session.user.id,
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

    return NextResponse.json(partnerLink, { status: 201 });
  },
);
