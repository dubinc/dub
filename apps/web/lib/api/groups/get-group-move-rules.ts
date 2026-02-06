import { groupRulesSchema } from "@/lib/zod/schemas/groups";
import { prisma } from "@dub/prisma";

export const getGroupMoveRules = async (programId: string) => {
  const groups = await prisma.partnerGroup.findMany({
    where: { programId },
    select: {
      id: true,
      name: true,
      workflow: {
        select: {
          triggerConditions: true,
        },
      },
    },
  });

  const results = groups.map((group) => ({
    id: group.id,
    name: group.name,
    moveRules: group.workflow?.triggerConditions ?? [],
  }));

  return groupRulesSchema.parse(results);
};
