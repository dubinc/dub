import { DubApiError, ErrorCodes } from "@/lib/api/errors";
import { processLink, updateLink } from "@/lib/api/links";
import { validatePartnerLinkUrl } from "@/lib/api/links/validate-partner-link-url";
import { parseRequestBody } from "@/lib/api/utils";
import { withReferralsEmbedToken } from "@/lib/embed/referrals/auth";
import { createPartnerLinkSchema } from "@/lib/zod/schemas/partners";
import { ReferralsEmbedLinkSchema } from "@/lib/zod/schemas/referrals-embed";
import { deepEqual } from "@dub/utils";
import { NextResponse } from "next/server";

// PATCH /api/embed/referrals/links/[linkId] - update a link for a partner
export const PATCH = withReferralsEmbedToken(
  async ({ req, params, programEnrollment, program, links, group }) => {
    const { url, key } = createPartnerLinkSchema
      .pick({ url: true, key: true })
      .parse(await parseRequestBody(req));

    if (
      ["banned", "deactivated", "rejected"].includes(programEnrollment.status)
    ) {
      throw new DubApiError({
        code: "forbidden",
        message: `You are ${programEnrollment.status} from this program hence cannot create links.`,
      });
    }

    const link = links.find((link) => link.id === params.linkId);

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

    if (link.partnerGroupDefaultLinkId) {
      const linkChanged = !deepEqual(
        {
          url,
          key,
        },
        {
          url: link.url,
          key: link.key,
        },
      );

      if (linkChanged) {
        throw new DubApiError({
          code: "forbidden",
          message: "This is your default link and cannot be updated.",
        });
      }
    }

    validatePartnerLinkUrl({ group, url });

    // if domain and key are the same, we don't need to check if the key exists
    const skipKeyChecks = link.key.toLowerCase() === key?.toLowerCase();

    const {
      link: processedLink,
      error,
      code,
    } = await processLink({
      // @ts-expect-error
      payload: {
        ...link,
        key: key || undefined,
        url: url || program.url,
      },
      workspace: {
        id: program.workspaceId,
        plan: "business",
      },
      userId: link.userId!,
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

    return NextResponse.json(ReferralsEmbedLinkSchema.parse(partnerLink));
  },
);
