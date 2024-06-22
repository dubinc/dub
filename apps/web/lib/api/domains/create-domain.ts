import { prisma } from "@/lib/prisma";
import { WorkspaceProps } from "@/lib/types";
import z from "@/lib/zod";
import { createDomainBodySchema } from "@/lib/zod/schemas/domains";

type CreateDomainInput = z.infer<typeof createDomainBodySchema> & {
  workspace: WorkspaceProps;
  userId: string;
  archived?: boolean;
};

export const createDomain = async (input: CreateDomainInput) => {
  const { slug, workspace, placeholder, expiredUrl } = input;

  // Add domain to the workspace
  return await prisma.domain.create({
    data: {
      slug: slug,
      projectId: workspace.id,
      primary: workspace.domains.length === 0,
      ...(placeholder && { placeholder }),
      ...(workspace.plan !== "free" && {
        expiredUrl,
      }),
    },
  });
};
