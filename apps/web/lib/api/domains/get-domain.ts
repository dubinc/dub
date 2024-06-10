import { prisma } from "@/lib/prisma";
import { DubApiError } from "../errors";
import { transformDomain } from "./transform-domain";

type GetDomainInput = {
  slug: string;
  workspaceId: string;
};

export const getDomain = async (input: GetDomainInput) => {
  const { slug, workspaceId } = input;

  const domain = await prisma.domain.findUnique({
    where: {
      slug: slug,
      projectId: workspaceId,
    },
    include: {
      links: {
        select: {
          url: true,
          rewrite: true,
          clicks: true,
          expiredUrl: true,
        },
        take: 1,
      },
    },
  });

  if (!domain) {
    throw new DubApiError({
      code: "not_found",
      message: `Domain ${slug} not found in the workspace.`,
    });
  }

  const { links, ...domainRecord } = domain;

  return transformDomain({
    ...domainRecord,
    ...links[0],
  });
};
