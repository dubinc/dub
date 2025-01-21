import { WorkspaceWithUsers } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { DUB_WORKSPACE_ID, isDubDomain } from "@dub/utils";
import { DubApiError } from "../errors";

export const getDomainOrThrow = async ({
  workspace,
  domain,
  dubDomainChecks,
}: {
  workspace: WorkspaceWithUsers;
  domain: string;
  dubDomainChecks?: boolean; // if we also need to make sure the user can actually make changes to dub default domains
}) => {
  const domainRecord = await prisma.domain.findUnique({
    where: { slug: domain },
    include: {
      registeredDomain: true,
    },
  });

  if (!domainRecord) {
    throw new DubApiError({
      code: "not_found",
      message: `Domain ${domain} not found.`,
    });
  }

  /* if domain is defined:
      - it's a dub domain:
        - if dubDomainChecks is true, check if the user is part of the dub workspace
        - if dubDomainChecks is false, do nothing
      - it's a custom domain:
        - check if the domain belongs to the workspace
  */
  if (isDubDomain(domain)) {
    if (dubDomainChecks && workspace.id !== DUB_WORKSPACE_ID) {
      throw new DubApiError({
        code: "forbidden",
        message: `Domain ${domain} does not belong to workspace ws_${workspace.id}.`,
      });
    }
  } else if (domainRecord.projectId !== workspace.id) {
    throw new DubApiError({
      code: "forbidden",
      message: `Domain ${domain} does not belong to workspace ws_${workspace.id}.`,
    });
  }

  return domainRecord;
};
