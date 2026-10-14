import {
  WorkflowContext,
  WorkflowTriggerEvent,
} from "@/lib/api/workflows/types";
import { logger, toErrorFields } from "@/lib/axiom/server";
import { aggregatePartnerLinksStats } from "@/lib/partners/aggregate-partner-links-stats";
import { prisma } from "@/lib/prisma";
import { WORKFLOW_ACTION_TYPES } from "@/lib/zod/schemas/workflows";
import { CommissionStatus, Workflow } from "@prisma/client";
import { WorkflowAttributeKey } from "./attribute-definitions";
import { executeAwardBountyWorkflow } from "./award-bounty/execute";
import { executeMoveGroupWorkflow } from "./move-group/execute";
import { parseWorkflowConfig } from "./parse-workflow-config";
import { executeSendCampaignWorkflow } from "./send-campaign/execute";

interface WorkflowActionHandler {
  execute(params: {
    workflow: Workflow;
    context: WorkflowContext;
  }): Promise<void>;
}

const ACTION_HANDLERS: Record<WORKFLOW_ACTION_TYPES, WorkflowActionHandler> = {
  [WORKFLOW_ACTION_TYPES.AwardBounty]: {
    execute: executeAwardBountyWorkflow,
  },

  [WORKFLOW_ACTION_TYPES.SendCampaign]: {
    execute: executeSendCampaignWorkflow,
  },

  [WORKFLOW_ACTION_TYPES.MoveGroup]: {
    execute: executeMoveGroupWorkflow,
  },
};

const EVENT_ATTRIBUTES: Record<WorkflowTriggerEvent, WorkflowAttributeKey[]> = {
  partnerEnrolled: ["partnerJoined"],
  leadRecorded: ["totalLeads", "partnerGroup"],
  saleRecorded: ["totalConversions", "totalSaleAmount", "partnerGroup"],
  commissionRecorded: ["totalCommissions", "partnerGroup"],
};

export async function executeWorkflows({
  event,
  identity,
  metrics,
}: WorkflowContext) {
  const { programId, partnerId } = identity;

  console.log("[Workflows] Executing workflows...", {
    event,
    programId,
    partnerId,
    identity,
    metrics,
  });

  const attributes = EVENT_ATTRIBUTES[event];

  if (attributes.length === 0) {
    console.log("[Workflows] No attributes found to execute workflows.");
    return;
  }

  const workflows = await prisma.workflow.findMany({
    where: {
      programId,
      disabledAt: null,
      OR: attributes.map((attribute) => ({
        triggerConditions: {
          path: "$[*].attribute",
          array_contains: attribute,
        },
      })),
    },
  });

  if (workflows.length === 0) {
    console.log("[Workflows] No workflows found to execute for trigger.");
    return;
  }

  console.log(`[Workflows] Found ${workflows.length} workflows to execute.`);

  const parsedWorkflows = workflows
    .map((workflow) => {
      try {
        return {
          workflow,
          config: parseWorkflowConfig(workflow),
        };
      } catch (error) {
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
    console.log("[Workflows] No valid workflows found to execute.");
    return;
  }

  // Commissions require a separate expensive aggregate query.
  // We only fetch if needed to avoid unnecessary database queries.
  const shouldFetchCommissions = parsedWorkflows.some(({ config }) =>
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
      include: {
        links: {
          select: {
            clicks: true,
            leads: true,
            conversions: true,
            sales: true,
            saleAmount: true,
          },
        },
        programPartnerTags: {
          select: {
            partnerTagId: true,
          },
        },
      },
    }),

    shouldFetchCommissions
      ? prisma.commission.aggregate({
          where: {
            earnings: {
              not: 0,
            },
            programId,
            partnerId,
            status: {
              in: [
                CommissionStatus.pending,
                CommissionStatus.processed,
                CommissionStatus.paid,
              ],
            },
          },
          _sum: {
            earnings: true,
          },
        })
      : Promise.resolve({
          _sum: {
            earnings: null,
          },
        }),
  ]);

  if (!programEnrollment) {
    console.error(
      `[Workflows] Partner ${partnerId} is not enrolled in program ${programId}.`,
    );
    return;
  }

  if (!programEnrollment.groupId) {
    console.error(
      `[Workflows] Partner ${partnerId} is not enrolled in any group in program ${programId}.`,
    );
    return;
  }

  const { totalLeads, totalSaleAmount, totalConversions } =
    aggregatePartnerLinksStats(programEnrollment.links);

  const workflowContext: WorkflowContext = {
    event,
    programEnrollment: {
      groupId: programEnrollment.groupId,
      createdAt: programEnrollment.createdAt,
      partnerId: programEnrollment.partnerId,
      programId: programEnrollment.programId,
      status: programEnrollment.status,
      programPartnerTags: programEnrollment.programPartnerTags,
    },
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

  for (const { workflow, config } of parsedWorkflows) {
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
      console.error(
        `[Workflows] Failed to execute workflow ${workflow.id}:`,
        error,
      );

      logger.error("workflows.execute_failed", {
        error: toErrorFields(error),
        correlation: {
          workflowId: workflow.id,
        },
      });

      continue;
    }
  }

  await logger.flush();
}
