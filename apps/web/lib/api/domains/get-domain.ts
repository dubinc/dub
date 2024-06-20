import { prisma } from "@/lib/prisma";
import { DubApiError } from "../errors";

type GetDomainInput =
  | {
      slug: string;
      workspaceId: string;
    }
  | {
      id: string;
    };

export const getDomain = async (input: GetDomainInput) => {
  const domain = await prisma.domain.findUnique({
    where: {
      ...("id" in input
        ? { id: input.id }
        : { slug: input.slug, projectId: input.workspaceId }),
    },
    include: {
      links: {
        select: {
          url: true,
          rewrite: true,
          clicks: true,
          expiredUrl: true,
          noindex: true,
        },
      },
    },
  });

  if (!domain) {
    throw new DubApiError({
      code: "not_found",
      message: `Domain not found in the workspace.`,
    });
  }

  return domain;
};
