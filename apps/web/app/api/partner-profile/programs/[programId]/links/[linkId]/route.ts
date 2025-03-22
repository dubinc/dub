import { DubApiError, ErrorCodes } from "@/lib/api/errors";
import { processLink, updateLink } from "@/lib/api/links";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withPartnerProfile } from "@/lib/auth/partner";
import { NewLinkProps } from "@/lib/types";
import { createPartnerLinkSchema } from "@/lib/zod/schemas/partners";
import { getApexDomain } from "@dub/utils";
import { NextResponse } from "next/server";

// PATCH /api/partner-profile/[programId]/links/[linkId] - update a link for a partner
export const PATCH = withPartnerProfile(
  async ({ partner, params, req, session }) => {
    const { url, key, comments } = createPartnerLinkSchema
      .pick({ url: true, key: true, comments: true })
      .parse(await parseRequestBody(req));

    const { programId, linkId } = params;

    const { program, links, status } = await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId,
    });

    if (status === "banned") {
      throw new DubApiError({
        code: "forbidden",
        message: "You are banned from this program.",
      });
    }

    const link = links.find((link) => link.id === linkId);

    if (!link) {
      throw new DubApiError({
        code: "not_found",
        message: "Link not found.",
      });
    }

    if (!program.domain || !program.url) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "This program needs a domain and URL set before creating a link.",
      });
    }

    if (url && getApexDomain(url) !== getApexDomain(program.url)) {
      throw new DubApiError({
        code: "bad_request",
        message: `The provided URL domain (${getApexDomain(url)}) does not match the program's domain (${getApexDomain(program.url)}).`,
      });
    }

    // if domain and key are the same, we don't need to check if the key exists
    const skipKeyChecks = link.key.toLowerCase() === key?.toLowerCase();

    const {
      link: processedLink,
      error,
      code,
    } = await processLink({
      payload: {
        ...link,
        // coerce types
        expiresAt:
          link.expiresAt instanceof Date
            ? link.expiresAt.toISOString()
            : link.expiresAt,
        geo: link.geo as NewLinkProps["geo"],

        // merge in new props
        key: key || undefined,
        url: url || program.url,
        comments,
      },
      workspace: {
        id: program.workspaceId,
        plan: "business",
      },
      userId: session.user.id,
      skipKeyChecks,
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

    const partnerLink = await updateLink({
      oldLink: {
        domain: link.domain,
        key: link.key,
        image: link.image,
      },
      updatedLink: processedLink,
    });

    return NextResponse.json(partnerLink, { status: 201 });
  },
);
