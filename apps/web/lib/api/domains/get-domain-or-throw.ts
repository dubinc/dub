import { prisma } from "@dub/prisma";
import { DUB_WORKSPACE_ID, isDubDomain } from "@dub/utils";
import { Project } from "@prisma/client";
import { DubApiError } from "../errors";
import { prefixWorkspaceId } from "../workspace-id";

export const getDomainOrThrow = async ({
  workspace,
  domain,
  dubDomainChecks,
}: {
  workspace: Pick<Project, "id">;
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
        message: `Domain ${domain} does not belong to workspace ${prefixWorkspaceId(workspace.id)}.`,
      });
    }
  } else if (domainRecord.projectId !== workspace.id) {
    throw new DubApiError({
      code: "forbidden",
      message: `Domain ${domain} does not belong to workspace ${prefixWorkspaceId(workspace.id)}.`,
    });
  }

  return domainRecord;
};
