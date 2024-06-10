import { prisma } from "@/lib/prisma";
import { NewLinkProps, WorkspaceProps } from "@/lib/types";
import z from "@/lib/zod";
import { updateDomainBodySchema } from "@/lib/zod/schemas/domains";
import { DubApiError, ErrorCodes } from "../errors";
import { processLink, updateLink } from "../links";
import { getDomain } from "./get-domain";
import { transformDomain } from "./transform-domain";

type UpdateDomainInput = z.infer<typeof updateDomainBodySchema> & {
  newSlug?: string;
  workspace: Pick<WorkspaceProps, "id" | "plan" | "domains">;
};

export const updateDomain = async (input: UpdateDomainInput) => {
  const {
    slug,
    newSlug,
    workspace,
    placeholder,
    type,
    target,
    expiredUrl,
    archived,
  } = input;

  // Update domain
  const domain = await prisma.domain.update({
    where: {
      slug,
    },
    data: {
      slug: newSlug,
      archived,
      ...(placeholder && { placeholder }),
    },
    include: {
      links: {
        take: 1,
      },
    },
  });

  // Skip link update if no link data is provided
  if (!("type" in input) && !("target" in input) && !("expiredUrl" in input)) {
    return transformDomain(domain);
  }

  const link = domain.links[0];

  const updatedLink = {
    ...link,
    expiresAt:
      link.expiresAt instanceof Date
        ? link.expiresAt.toISOString()
        : link.expiresAt,
    geo: link.geo as NewLinkProps["geo"],
    ...(workspace.plan != "free" && {
      ...("rewrite" in input && { rewrite: type === "rewrite" }),
      ...("target" in input && { url: target || "" }),
      ...("expiredUrl" in input && { expiredUrl }),
    }),
  };

  const {
    link: processedLink,
    error,
    code,
  } = await processLink({
    payload: updatedLink,
    workspace,
    skipKeyChecks: true,
  });

  if (error != null) {
    throw new DubApiError({
      code: code as ErrorCodes,
      message: error,
    });
  }

  // Update the link
  await updateLink({
    oldDomain: link.domain,
    oldKey: link.key,
    updatedLink: processedLink,
  });

  // Return the domain record
  return await getDomain({
    slug: domain.slug,
    workspaceId: workspace.id,
  });
};
