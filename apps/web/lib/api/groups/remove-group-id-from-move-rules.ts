import type { WorkflowCondition } from "@/lib/api/workflows/types";
import { prisma } from "@/lib/prisma";
import { workflowConditionsSchema } from "@/lib/zod/schemas/workflows";

// Scrubs a deleted group ID from other groups' move-rule workflows in the program.
export async function removeGroupIdFromMoveRules({
  programId,
  groupId,
}: {
  programId: string;
  groupId: string;
}): Promise<void> {
  const groups = await prisma.partnerGroup.findMany({
    where: {
      programId,
      id: { not: groupId },
      workflowId: { not: null },
    },
    select: {
      workflowId: true,
      workflow: {
        select: {
          id: true,
          triggerConditions: true,
        },
      },
    },
  });

  for (const group of groups) {
    if (!group.workflowId || !group.workflow) {
      continue;
    }

    const parsed = workflowConditionsSchema.safeParse(
      group.workflow.triggerConditions,
    );

    if (!parsed.success) {
      continue;
    }

    const nextConditions = scrubGroupIdFromConditions({
      conditions: parsed.data,
      groupId,
    });

    if (JSON.stringify(nextConditions) === JSON.stringify(parsed.data)) {
      continue;
    }

    await prisma.workflow.update({
      where: {
        id: group.workflowId,
      },
      data: {
        triggerConditions: nextConditions,
      },
    });
  }
}

function scrubGroupIdFromConditions({
  conditions,
  groupId,
}: {
  conditions: WorkflowCondition[];
  groupId: string;
}): WorkflowCondition[] {
  return conditions.flatMap((condition) => {
    if (condition.attribute !== "partnerGroup") {
      return [condition];
    }

    const { value } = condition;

    if (typeof value === "string") {
      return value === groupId ? [] : [condition];
    }

    if (Array.isArray(value)) {
      const nextValue = value.filter((id) => id !== groupId);

      if (nextValue.length === 0) {
        return [];
      }

      if (nextValue.length === value.length) {
        return [condition];
      }

      return [{ ...condition, value: nextValue }];
    }

    return [condition];
  });
}
