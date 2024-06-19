import { prisma } from "@/lib/prisma";
import { WorkspaceProps } from "@/lib/types";
import z from "@/lib/zod";
import { addDomainBodySchema } from "@/lib/zod/schemas/domains";
import { DubApiError, ErrorCodes } from "../errors";
import { createLink, processLink } from "../links";
import { getDomain } from "./get-domain";

type AddDomainInput = z.infer<typeof addDomainBodySchema> & {
  workspace: WorkspaceProps;
  userId: string;
  archived?: boolean;
};

export const addDomain = async (input: AddDomainInput) => {
  const {
    slug,
    workspace,
    placeholder,
    type,
    target,
    expiredUrl,
    userId,
    noindex,
  } = input;

  // Add domain to the workspace
  const domain = await prisma.domain.create({
    data: {
      slug: slug,
      projectId: workspace.id,
      primary: workspace.domains.length === 0,
      ...(placeholder && { placeholder }),
    },
  });

  workspace.domains.push({
    slug: domain.slug,
    primary: domain.primary,
  });

  // Process the domain link
  const { link, error, code } = await processLink({
    payload: {
      id: domain.id,
      domain: domain.slug,
      key: "_root",
      createdAt: domain.createdAt,
      archived: false,
      proxy: false,
      publicStats: false,
      trackConversion: false,
      ...(workspace.plan === "free"
        ? {
            url: "",
            expiredUrl: null,
            rewrite: false,
            noindex: false,
          }
        : {
            url: target || "",
            expiredUrl: expiredUrl || null,
            rewrite: type === "rewrite",
            noindex,
          }),
    },
    workspace,
    userId: userId,
    skipKeyChecks: true,
  });

  if (error != null) {
    throw new DubApiError({
      code: code as ErrorCodes,
      message: error,
    });
  }

  // Create a link for the domain
  await createLink(link);

  // Return the domain record
  return await getDomain({
    slug: domain.slug,
    workspaceId: workspace.id,
  });
};
