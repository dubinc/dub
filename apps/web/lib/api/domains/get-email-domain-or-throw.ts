import { prisma } from "@dub/prisma";
import { Project } from "@prisma/client";
import { DubApiError } from "../errors";
import { prefixWorkspaceId } from "../workspace-id";

export const getEmailDomainOrThrow = async ({
  workspace,
  domain,
}: {
  workspace: Pick<Project, "id">;
  domain: string;
}) => {
  const domainRecord = await prisma.emailDomain.findUnique({
    where: {
      slug: domain,
    },
  });

  if (!domainRecord) {
    throw new DubApiError({
      code: "not_found",
      message: `Domain ${domain} not found.`,
    });
  }

  if (domainRecord.workspaceId !== workspace.id) {
    throw new DubApiError({
      code: "forbidden",
      message: `Domain ${domain} does not belong to workspace ${prefixWorkspaceId(workspace.id)}.`,
    });
  }

  return domainRecord;
};
