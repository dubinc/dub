import { prisma } from "@/lib/prisma";
import { WorkspaceProps } from "@/lib/types";
import { Domain } from "@prisma/client";
import { DubApiError } from "../errors";

interface GetDomainParams {
  workspace: WorkspaceProps;
  linkId?: string;
  slug?: string;
  key?: string;
}

// Find domain
export const getDomain = async ({
  workspace,
  slug,
  linkId,
  key,
}: GetDomainParams) => {
  let domain: Domain | null = null;

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

  if (domain.projectId !== workspace.id) {
    throw new DubApiError({
      code: "forbidden",
      message: "Domain not found",
    });
  }

  return domain;
};
