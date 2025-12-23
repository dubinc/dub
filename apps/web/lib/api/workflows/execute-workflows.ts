import { aggregatePartnerLinksStats } from "@/lib/partners/aggregate-partner-links-stats";
import { WorkflowConditionAttribute, WorkflowContext } from "@/lib/types";
import { WORKFLOW_ACTION_TYPES } from "@/lib/zod/schemas/workflows";
import { prisma } from "@dub/prisma";
import { Workflow } from "@dub/prisma/client";
import { prettyPrint } from "@dub/utils";
import { executeCompleteBountyWorkflow } from "./execute-complete-bounty-workflow";
import { executeMoveGroupWorkflow } from "./execute-move-group-workflow";
import { executeSendCampaignWorkflow } from "./execute-send-campaign-workflow";
import { parseWorkflowConfig } from "./parse-workflow-config";

interface WorkflowActionHandler {
  execute(params: {
    workflow: Workflow;
    context: WorkflowContext;
  }): Promise<void>;
}

const ACTION_HANDLERS: Record<WORKFLOW_ACTION_TYPES, WorkflowActionHandler> = {
  [WORKFLOW_ACTION_TYPES.AwardBounty]: {
    execute: executeCompleteBountyWorkflow,
  },

  [WORKFLOW_ACTION_TYPES.SendCampaign]: {
    execute: executeSendCampaignWorkflow,
  },

  [WORKFLOW_ACTION_TYPES.MoveGroup]: {
    execute: executeMoveGroupWorkflow,
  },
};

const DEPENDS_ON_BY_REASON: Record<
  NonNullable<WorkflowContext["reason"]>,
  WorkflowConditionAttribute[] | undefined
> = {
  lead: ["totalLeads"],
  sale: ["totalConversions", "totalSaleAmount"],
  commission: ["totalCommissions"],
};

export async function executeWorkflows({
  trigger,
  reason,
  identity,
  metrics,
}: WorkflowContext) {
  const { programId, partnerId } = identity;

  let workflows = await prisma.workflow.findMany({
    where: {
      programId,
      disabledAt: null,
      trigger,
    },
  });

  if (workflows.length === 0) {
    return;
  }

  const dependsOnAttributes = reason ? DEPENDS_ON_BY_REASON[reason] : undefined;

  if (dependsOnAttributes?.length) {
    workflows = workflows.filter((w) => {
      const { conditions } = parseWorkflowConfig(w);
      return conditions.some(({ attribute }) =>
        dependsOnAttributes.includes(attribute),
      );
    });
  }

  if (workflows.length === 0) {
    return;
  }

  const programEnrollment = await prisma.programEnrollment.findUnique({
    where: {
      partnerId_programId: {
        partnerId,
        programId,
      },
    },
    select: {
      partnerId: true,
      groupId: true,
      totalCommissions: true,
      links: {
        select: {
          clicks: true,
          leads: true,
          conversions: true,
          sales: true,
          saleAmount: true,
        },
      },
    },
  });

  if (!programEnrollment) {
    console.error(
      `Partner ${partnerId} is not enrolled in program ${programId}.`,
    );
    return;
  }

  if (!programEnrollment.groupId) {
    console.error(
      `Partner ${partnerId} is not enrolled in a group in program ${programId}.`,
    );
    return;
  }

  const { totalLeads, totalSaleAmount, totalConversions } =
    aggregatePartnerLinksStats(programEnrollment.links);

  const workflowContext: WorkflowContext = {
    trigger,
    reason,
    identity: {
      ...identity,
      groupId: programEnrollment.groupId,
    },
    metrics: {
      ...metrics,
      aggregated: {
        leads: totalLeads,
        conversions: totalConversions,
        saleAmount: totalSaleAmount,
        commissions: programEnrollment.totalCommissions,
      },
    },
  };

  console.log("workflowContext", prettyPrint(workflowContext));

  for (const workflow of workflows) {
    const { conditions, action } = parseWorkflowConfig(workflow);

    if (conditions.length === 0 || !action) {
      continue;
    }

    const handler = ACTION_HANDLERS[action.type];

    if (!handler) {
      throw new Error(`Unsupported workflow action ${action.type}`);
    }

    if (
      dependsOnAttributes &&
      !conditions.some((cond) => dependsOnAttributes.includes(cond.attribute))
    ) {
      continue;
    }

    console.log(`Executing workflow ${workflow.id} with action ${action.type}`);

    await handler.execute({
      workflow,
      context: workflowContext,
    });
  }
}
