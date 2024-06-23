import { prisma } from "@/lib/prisma";
import { WorkspaceWithUsers } from "@/lib/types";
import { DUB_WORKSPACE_ID, isDubDomain } from "@dub/utils";
import { DubApiError } from "../errors";

export const getDomainOrThrow = async ({
  workspace,
  domain,
  domainChecks,
}: {
  workspace: WorkspaceWithUsers;
  domain: string;
  domainChecks?: boolean; // if the action needs to check if the domain belongs to the workspace
}) => {
  const domainRecord = await prisma.domain.findUnique({
    where: { slug: domain },
  });

  if (!domainRecord) {
    throw new DubApiError({
      code: "not_found",
      message: `Domain ${domain} not found.`,
    });
  }

  // if domain is defined:
  // - it's a dub domain and domainChecks is required, check if the user is part of the dub workspace
  // - it's a custom domain, check if the domain belongs to the workspace
  if (isDubDomain(domain)) {
    if (domainChecks && workspace.id !== DUB_WORKSPACE_ID) {
      throw new DubApiError({
        code: "forbidden",
        message: `Domain ${domain} does not belong to workspace ws_${workspace.id}.`,
      });
    }
  } else {
    if (domainRecord.projectId !== workspace.id) {
      throw new DubApiError({
        code: "forbidden",
        message: `Domain ${domain} does not belong to workspace ws_${workspace.id}.`,
      });
    }
  }

  return domainRecord;
};
