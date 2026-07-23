import type { GroupMoveCondition } from "@/lib/zod/schemas/group-move-workflows";
import { Prisma } from "@prisma/client";

type TransactionClient = Prisma.TransactionClient;

export async function scrubFromPartnerGroupReferences({
  programId,
  deletedGroupId,
  tx,
}: {
  programId: string;
  deletedGroupId: string;
  tx: TransactionClient;
}) {
  const groups = await tx.partnerGroup.findMany({
    where: {
      programId,
      id: {
        not: deletedGroupId,
      },
      workflowId: {
        not: null,
      },
    },
    select: {
      id: true,
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
    if (!group.workflow || !group.workflowId) {
      continue;
    }

    const conditions = group.workflow.triggerConditions;
    if (!Array.isArray(conditions)) {
      continue;
    }

    const nextConditions = scrubConditions({
      conditions: conditions as GroupMoveCondition[],
      deletedGroupId,
    });

    if (nextConditions === null) {
      continue;
    }

    if (nextConditions.length === 0) {
      await tx.partnerGroup.update({
        where: {
          id: group.id,
        },
        data: {
          workflowId: null,
        },
      });
      await tx.workflow.delete({
        where: {
          id: group.workflowId,
        },
      });
      continue;
    }

    await tx.workflow.update({
      where: {
        id: group.workflowId,
      },
      data: {
        triggerConditions: nextConditions,
      },
    });
  }
}

/** Returns null when nothing changed; otherwise the scrubbed conditions array. */
export function scrubConditions({
  conditions,
  deletedGroupId,
}: {
  conditions: GroupMoveCondition[];
  deletedGroupId: string;
}): GroupMoveCondition[] | null {
  let changed = false;
  const nextConditions: GroupMoveCondition[] = [];

  for (const condition of conditions) {
    if (condition.attribute !== "fromPartnerGroup") {
      nextConditions.push(condition);
      continue;
    }

    if (
      condition.operator === "equals_to" ||
      condition.operator === "not_equals"
    ) {
      if (condition.value === deletedGroupId) {
        changed = true;
        continue;
      }
      nextConditions.push(condition);
      continue;
    }

    if (condition.operator === "in" || condition.operator === "not_in") {
      if (!Array.isArray(condition.value)) {
        nextConditions.push(condition);
        continue;
      }

      if (!condition.value.includes(deletedGroupId)) {
        nextConditions.push(condition);
        continue;
      }

      changed = true;
      const filtered = condition.value.filter((id) => id !== deletedGroupId);
      if (filtered.length === 0) {
        continue;
      }

      nextConditions.push({
        ...condition,
        value: filtered,
      });
      continue;
    }

    nextConditions.push(condition);
  }

  return changed ? nextConditions : null;
}
