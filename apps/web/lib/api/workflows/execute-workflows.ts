import { aggregatePartnerLinksStats } from "@/lib/partners/aggregate-partner-links-stats";
import { WorkflowConditionAttribute, WorkflowContext } from "@/lib/types";
import { WORKFLOW_ACTION_TYPES } from "@/lib/zod/schemas/workflows";
import { prisma } from "@dub/prisma";
import { Workflow } from "@dub/prisma/client";
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

// Map reason to expected attributes for early filtering optimization.
// This prevents workflows from executing unnecessarily
const REASON_TO_ATTRIBUTES: Record<
  NonNullable<WorkflowContext["reason"]>,
  WorkflowConditionAttribute[]
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
    console.log(
      `No workflows found to execute for trigger ${trigger} and reason ${reason}.`,
    );
    return;
  }

  // Parse all workflow configs once upfront, filtering out any that fail to parse
  const parsedWorkflows = workflows
    .map((workflow) => {
      try {
        return {
          workflow,
          config: parseWorkflowConfig(workflow),
        };
      } catch (error) {
        console.error(
          `Failed to parse workflow config for workflow ${workflow.id}, skipping:`,
          error,
        );
        return null;
      }
    })
    .filter(
      (
        item,
      ): item is {
        workflow: Workflow;
        config: ReturnType<typeof parseWorkflowConfig>;
      } => item !== null,
    );

  if (parsedWorkflows.length === 0) {
    console.log(
      `No valid workflows found to execute for trigger ${trigger} and reason ${reason}.`,
    );
    return;
  }

  // Filter by reason if provided
  let filteredWorkflows = parsedWorkflows;
  if (reason) {
    const expectedAttributes = REASON_TO_ATTRIBUTES[reason];
    filteredWorkflows = parsedWorkflows.filter(({ config }) =>
      config.conditions.some(({ attribute }) =>
        expectedAttributes.includes(attribute),
      ),
    );

    if (filteredWorkflows.length === 0) {
      console.log(
        `No relevant workflows found to execute for trigger ${trigger} and reason ${reason}.`,
      );
      return;
    }
  }

  // Commissions require a separate expensive aggregate query.
  // We only fetch if needed to avoid unnecessary database queries.
  const shouldFetchCommissions = filteredWorkflows.some(({ config }) =>
    config.conditions.some((c) => c.attribute === "totalCommissions"),
  );

  const [programEnrollment, totalCommissions] = await Promise.all([
    prisma.programEnrollment.findUnique({
      where: {
        partnerId_programId: {
          partnerId,
          programId,
        },
      },
      select: {
        partnerId: true,
        groupId: true,
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
    }),

    shouldFetchCommissions
      ? prisma.commission.aggregate({
          where: {
            earnings: { not: 0 },
            programId,
            partnerId,
            status: {
              in: ["pending", "processed", "paid"],
            },
          },
          _sum: {
            earnings: true,
          },
        })
      : Promise.resolve({ _sum: { earnings: null } }),
  ]);

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
        commissions: totalCommissions._sum.earnings ?? 0,
      },
    },
  };

  for (const { workflow, config } of filteredWorkflows) {
    try {
      const handler = ACTION_HANDLERS[config.action.type];

      if (!handler) {
        throw new Error(`Unsupported workflow action ${config.action.type}`);
      }

      await handler.execute({
        workflow,
        context: workflowContext,
      });
    } catch (error) {
      console.error(`Failed to execute workflow ${workflow.id}:`, error);
      continue;
    }
  }
}
