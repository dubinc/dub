import { prisma } from "@/lib/prisma";
import z from "@/lib/zod";
import { Domain } from "@prisma/client";
import { DubApiError } from "../errors";

export const getDomainSchema = z.object({
  workspaceId: z.string(),
  linkId: z.string().optional(),
  slug: z.string().optional(),
  key: z.string().optional(),
});

// Find domain
export const getDomain = async ({
  workspaceId,
  slug,
  linkId,
  key,
}: z.infer<typeof getDomainSchema>) => {
  let domain: Domain | null = null;

  // if ((linkId || (domain && key && key !== "_root")) && !skipLinkChecks) {
  //   // special case for getting domain by ID
  //   // TODO: refactor domains to use the same logic as links
  //   if (!link && searchParams.checkDomain === "true") {
  //     const domain = await prisma.domain.findUnique({
  //       where: {
  //         id: linkId,
  //       },
  //     });
  //     if (domain) {
  //       link = {
  //         ...domain,
  //         domain: domain.slug,
  //         key: "_root",
  //         url: domain.target || "",
  //       } as unknown as LinkProps;
  //     }
  //   }
  // }

  if (slug) {
    domain = await prisma.domain.findUnique({
      where: {
        slug,
      },
    });
  }

  if (!domain) {
    throw new DubApiError({
      code: "not_found",
      message: "Domain not found",
    });
  }

  if (domain.projectId !== workspaceId) {
    throw new DubApiError({
      code: "forbidden",
      message: "Domain not found",
    });
  }

  return domain;
};
