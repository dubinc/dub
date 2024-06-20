import { prisma } from "@/lib/prisma";
import { WorkspaceProps } from "@/lib/types";
import z from "@/lib/zod";
import { updateDomainBodySchema } from "@/lib/zod/schemas/domains";

type UpdateDomainInput = z.infer<typeof updateDomainBodySchema> & {
  newSlug?: string;
  workspace: Pick<WorkspaceProps, "id" | "plan" | "domains">;
};

export const updateDomain = async (input: UpdateDomainInput) => {
  const { slug, newSlug, workspace, placeholder, expiredUrl, archived } = input;

  // Update domain
  return await prisma.domain.update({
    where: {
      slug,
    },
    data: {
      slug: newSlug,
      archived,
      ...(placeholder && { placeholder }),
      ...(workspace.plan != "free" && {
        expiredUrl,
      }),
    },
    include: {
      links: {
        take: 1,
      },
    },
  });
};
