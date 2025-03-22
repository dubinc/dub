import { DubApiError, ErrorCodes } from "@/lib/api/errors";
import {
  createLink,
  processLink,
  transformLink,
  updateLink,
} from "@/lib/api/links";
import { includeTags } from "@/lib/api/links/include-tags";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { NewLinkProps } from "@/lib/types";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { linkEventSchema } from "@/lib/zod/schemas/links";
import { upsertPartnerLinkSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { deepEqual, getApexDomain } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// PUT /api/partners/links/upsert – update or create a partner link
export const PUT = withWorkspace(
  async ({ req, headers, workspace, session }) => {
    const { programId, partnerId, tenantId, url, key, linkProps } =
      upsertPartnerLinkSchema.parse(await parseRequestBody(req));

    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    if (!program.domain || !program.url) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "You need to set a domain and url for this program before creating a partner.",
      });
    }

    if (getApexDomain(url) !== getApexDomain(program.url)) {
      throw new DubApiError({
        code: "bad_request",
        message: `The provided URL domain (${getApexDomain(url)}) does not match the program's domain (${getApexDomain(program.url)}).`,
      });
    }

    if (!partnerId && !tenantId) {
      throw new DubApiError({
        code: "bad_request",
        message: "You must provide a partnerId or tenantId.",
      });
    }

    const partner = await prisma.programEnrollment.findUnique({
      where: partnerId
        ? { partnerId_programId: { partnerId, programId } }
        : { tenantId_programId: { tenantId: tenantId!, programId } },
    });

    if (!partner) {
      throw new DubApiError({
        code: "not_found",
        message: "Partner not found.",
      });
    }

    const link = await prisma.link.findFirst({
      where: {
        projectId: workspace.id,
        programId,
        partnerId,
        url,
      },
      include: includeTags,
    });

    if (link) {
      // proceed with /api/links/[linkId] PATCH logic
      const updatedLink = {
        // original link
        ...link,
        // coerce types
        expiresAt:
          link.expiresAt instanceof Date
            ? link.expiresAt.toISOString()
            : link.expiresAt,
        geo: link.geo as NewLinkProps["geo"],
        // merge in new props
        ...linkProps,
        // set default fields
        domain: program.domain,
        ...(key && { key }),
        url,
        programId: program.id,
        tenantId: partner.tenantId,
        partnerId: partner.partnerId,
        folderId: program.defaultFolderId,
        trackConversion: true,
      };

      // if link and updatedLink are identical, return the link
      if (deepEqual(link, updatedLink)) {
        return NextResponse.json(transformLink(link), {
          headers,
        });
      }

      // if domain and key are the same, we don't need to check if the key exists
      const skipKeyChecks =
        link.domain === updatedLink.domain &&
        link.key.toLowerCase() === updatedLink.key?.toLowerCase();

      // if externalId is the same, we don't need to check if it exists
      const skipExternalIdChecks =
        link.externalId?.toLowerCase() ===
        updatedLink.externalId?.toLowerCase();

      const {
        link: processedLink,
        error,
        code,
      } = await processLink({
        payload: updatedLink,
        workspace,
        skipKeyChecks,
        skipExternalIdChecks,
      });

      if (error) {
        throw new DubApiError({
          code: code as ErrorCodes,
          message: error,
        });
      }

      try {
        const response = await updateLink({
          oldLink: {
            domain: link.domain,
            key: link.key,
            image: link.image,
          },
          updatedLink: processedLink,
        });

        waitUntil(
          sendWorkspaceWebhook({
            trigger: "link.updated",
            workspace,
            data: linkEventSchema.parse(response),
          }),
        );

        return NextResponse.json(response, {
          headers,
        });
      } catch (error) {
        throw new DubApiError({
          code: "unprocessable_entity",
          message: error.message,
        });
      }
    } else {
      // proceed with /api/partners/links POST logic
      const { link, error, code } = await processLink({
        payload: {
          ...linkProps,
          domain: program.domain,
          key: key || undefined,
          url,
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

      const partnerLink = await createLink(link);

      waitUntil(
        sendWorkspaceWebhook({
          trigger: "link.created",
          workspace,
          data: linkEventSchema.parse(partnerLink),
        }),
      );

      return NextResponse.json(partnerLink, {
        headers,
      });
    }
  },
  {
    requiredPermissions: ["links.write"],
  },
);
