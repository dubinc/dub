import { DubApiError, ErrorCodes } from "@/lib/api/errors";
import { deleteLink, editLink, processLink } from "@/lib/api/links";
import { withWorkspace } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NewLinkProps } from "@/lib/types";
import { updateLinkBodySchema } from "@/lib/zod/schemas";
import { NextResponse } from "next/server";

// GET /api/links/[linkId] – get a link
export const GET = withWorkspace(async ({ headers, link }) => {
  if (!link) {
    throw new DubApiError({
      code: "not_found",
      message: "Link not found.",
    });
  }

  const tags = await prisma.tag.findMany({
    where: {
      links: {
        some: {
          linkId: link.id,
        },
      },
    },
    select: {
      id: true,
      name: true,
      color: true,
    },
  });
  return NextResponse.json(
    {
      ...link,
      tagId: tags?.[0]?.id ?? null, // backwards compatibility
      tags,
    },
    {
      headers,
    },
  );
});

// PUT /api/links/[linkId] – update a link
export const PUT = withWorkspace(async ({ req, headers, workspace, link }) => {
  if (!link) {
    throw new DubApiError({
      code: "not_found",
      message: "Link not found.",
    });
  }

  const body = updateLinkBodySchema.parse(await req.json());

  // Add body onto existing link but maintain NewLinkProps form for processLink
  const updatedLink = {
    ...link,
    expiresAt:
      link.expiresAt instanceof Date
        ? link.expiresAt.toISOString()
        : link.expiresAt,
    geo: link.geo as NewLinkProps["geo"],
    ...body,
  };

  if (updatedLink.projectId !== link?.projectId) {
    throw new DubApiError({
      code: "forbidden",
      message:
        "Transferring links to another workspace is only allowed via the /links/[linkId]transfer endpoint.",
    });
  }

  const {
    link: processedLink,
    error,
    code,
  } = await processLink({
    payload: updatedLink,
    workspace,
    // if domain and key are the same, we don't need to check if the key exists
    skipKeyChecks:
      link.domain === updatedLink.domain &&
      link.key.toLowerCase() === updatedLink.key?.toLowerCase(),
  });

  if (error) {
    throw new DubApiError({
      code: code as ErrorCodes,
      message: error,
    });
  }

  const response = await editLink({
    oldDomain: link.domain,
    oldKey: link.key,
    updatedLink: processedLink,
  });

  return NextResponse.json(response, {
    headers,
  });
});

// DELETE /api/links/[linkId] – delete a link
export const DELETE = withWorkspace(async ({ headers, link }) => {
  await deleteLink(link!.id);

  return NextResponse.json(
    { id: link?.id },
    {
      headers,
    },
  );
});
