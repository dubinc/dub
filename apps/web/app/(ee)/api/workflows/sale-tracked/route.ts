import { isFirstConversion } from "@/lib/analytics/is-first-conversion";
import { detectAndRecordFraudEvent } from "@/lib/api/fraud/detect-record-fraud-event";
import { syncPartnerLinksStats } from "@/lib/api/partners/sync-partner-links-stats";
import { executeWorkflows } from "@/lib/api/workflows/execute-workflows";
import { logger } from "@/lib/axiom/server";
import { getWorkflowConfig } from "@/lib/cron/qstash-workflow";
import { constructWebhookPartner } from "@/lib/partners/constuct-webhook-partner";
import { createPartnerCommission } from "@/lib/partners/create-partner-commission";
import { sendPartnerPostback } from "@/lib/postback/send-partner-postback";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { transformSaleEventData } from "@/lib/webhook/transform";
import { WebhookPartnerSchema } from "@/lib/zod/schemas/partners";
import { CUSTOMER_SOURCES } from "@/lib/zod/schemas/rewards";
import { saleEventSchemaTB } from "@/lib/zod/schemas/sales";
import { prisma } from "@dub/prisma";
import { Customer, Link } from "@dub/prisma/client";
import { pick } from "@dub/utils";
import { WorkflowNonRetryableError } from "@upstash/workflow";
import { serve } from "@upstash/workflow/nextjs";
import * as z from "zod/v4";

const inputSchema = z.object({
  saleEvent: saleEventSchemaTB,
  source: z.enum(CUSTOMER_SOURCES),
});

type Input = z.infer<typeof inputSchema>;

type StepFunctionInput = Input & {
  link: Link;
  customer: Customer;
};

// POST /api/workflows/sale-tracked
export const { POST } = serve<Input>(
  async (context) => {
    const input = context.requestPayload;
    const { link_id: linkId, customer_id: customerId } = input.saleEvent;

    const link = await prisma.link.findUnique({
      where: {
        id: linkId,
      },
    });

    if (!link) {
      throw new WorkflowNonRetryableError(`Link ${linkId} not found.`);
    }

    const customer = await prisma.customer.findUnique({
      where: {
        id: customerId,
      },
    });

    if (!customer) {
      throw new WorkflowNonRetryableError(`Customer ${customerId} not found.`);
    }

    // Step 1:  Sync link stats, customer stats, workspace usage, and program/partner associations
    const { isFirstConversion } = await context.run(
      "update-stats",
      async () => {
        return await stepUpdateStats({
          ...input,
          link,
          customer,
        });
      },
    );

    // Step 2:  Create partner commission
    if (link.programId && link.partnerId) {
      await context.run("create-commission", async () => {
        await stepCreateCommission({
          ...input,
          link,
          customer,
        });
      });
    }

    // Step 3: Send webhooks
    await context.run("send-webhooks", async () => {
      await stepSendWebhooks({
        ...input,
        link,
        customer,
      });
    });

    // Step 4: Run fraud detection
    if (link.programId && link.partnerId) {
      await context.run("run-fraud-detection", async () => {
        await stepRunFraudDetection({
          ...input,
          link,
          customer,
          isFirstConversion,
        });
      });
    }

    // Step 5: Execute Dub workflow
    if (link.programId && link.partnerId) {
      await context.run("execute-dub-workflow", async () => {
        await stepExecuteWorkflow({
          ...input,
          link,
          customer,
          isFirstConversion,
        });
      });
    }
  },
  {
    initialPayloadParser: (input) => inputSchema.parse(JSON.parse(input)),
    failureFunction: async ({
      context,
      failStatus,
      failResponse,
      failHeaders,
    }) => {
      const { correlation } = getWorkflowConfig({
        workflowType: "partner-approved",
        body: context.requestPayload,
      });

      logger.error("workflow.failed", {
        service: "qstash",
        event: "workflow.failed",
        workflowType: "sale-tracked",
        workflowRunId: context.workflowRunId,
        failStatus,
        failResponse,
        failHeaders,
        correlation,
      });

      await logger.flush();
    },
  },
);

async function stepUpdateStats({
  saleEvent,
  link,
  customer,
}: StepFunctionInput) {
  const { workspace_id: workspaceId, amount } = saleEvent;

  const firstConversionFlag = isFirstConversion({
    customer,
    linkId: link.id,
  });

  await prisma.$transaction([
    prisma.project.update({
      where: {
        id: workspaceId,
      },
      data: {
        usage: {
          increment: 1,
        },
      },
    }),

    prisma.link.update({
      where: {
        id: link.id,
      },
      data: {
        sales: {
          increment: 1,
        },
        saleAmount: {
          increment: amount,
        },
        ...(firstConversionFlag && {
          conversions: {
            increment: 1,
          },
          lastConversionAt: new Date(),
        }),
      },
    }),

    prisma.customer.update({
      where: {
        id: customer.id,
      },
      data: {
        ...(link.programId && {
          programId: link.programId,
        }),
        ...(link.partnerId && {
          partnerId: link.partnerId,
        }),
        sales: {
          increment: 1,
        },
        saleAmount: {
          increment: amount,
        },
        firstSaleAt: customer.firstSaleAt ? undefined : new Date(),
      },
    }),
  ]);

  if (link.programId && link.partnerId) {
    await syncPartnerLinksStats({
      partnerId: link.partnerId,
      programId: link.programId,
      eventType: "sale",
    });
  }

  // Return value is persisted with the step so replays after later steps do not re-derive a
  // stale firstConversionFlag from the customer row.
  return {
    isFirstConversion: firstConversionFlag,
  };
}

async function stepCreateCommission({
  saleEvent,
  link,
  customer,
  source,
}: StepFunctionInput) {
  if (!link.programId || !link.partnerId) {
    return;
  }

  const {
    invoice_id: invoiceId,
    event_id: eventId,
    currency,
    amount,
  } = saleEvent;

  const metadata = parseMetadata(saleEvent.metadata);

  await createPartnerCommission({
    event: "sale",
    programId: link.programId,
    partnerId: link.partnerId,
    linkId: link.id,
    customerId: customer.id,
    eventId,
    amount,
    quantity: 1,
    invoiceId,
    currency,
    context: {
      customer: {
        country: customer.country,
        signupDate: customer.createdAt,
        source,
      },
      sale: {
        productId: metadata?.productId,
        amount,
      },
    },
  });
}

async function stepSendWebhooks({
  saleEvent,
  link,
  customer,
}: StepFunctionInput) {
  const { workspace_id: workspaceId } = saleEvent;

  let webhookPartner: z.infer<typeof WebhookPartnerSchema> | undefined;

  const workspace = await prisma.project.findUnique({
    where: {
      id: workspaceId,
    },
    select: {
      id: true,
      webhookEnabled: true,
    },
  });

  if (!workspace) {
    return;
  }

  // Find the partner for the program's link
  if (workspace.webhookEnabled && link.programId && link.partnerId) {
    const programEnrollment = await prisma.programEnrollment.findUnique({
      where: {
        partnerId_programId: {
          partnerId: link.partnerId,
          programId: link.programId,
        },
      },
      include: {
        partner: true,
        links: true,
      },
    });

    if (programEnrollment) {
      webhookPartner = constructWebhookPartner(programEnrollment);
    }
  }

  await sendWorkspaceWebhook({
    trigger: "sale.created",
    data: transformSaleEventData({
      ...saleEvent,
      clickedAt: customer.clickedAt || customer.createdAt,
      link,
      customer,
      partner: webhookPartner,
      metadata: parseMetadata(saleEvent.metadata),
    }),
    workspace,
  });

  if (link.programId && link.partnerId) {
    await sendPartnerPostback({
      partnerId: link.partnerId,
      event: "sale.created",
      data: {
        ...saleEvent,
        clickedAt: customer.clickedAt || customer.createdAt,
        link,
        customer,
      },
    });
  }
}

async function stepRunFraudDetection({
  saleEvent,
  link,
  customer,
  isFirstConversion,
}: StepFunctionInput & { isFirstConversion: boolean }) {
  if (!link.programId || !link.partnerId) {
    return;
  }

  const programEnrollment = await prisma.programEnrollment.findUnique({
    where: {
      partnerId_programId: {
        partnerId: link.partnerId,
        programId: link.programId,
      },
    },
    select: {
      status: true,
      partner: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  if (!programEnrollment) {
    return;
  }

  const { partner } = programEnrollment;

  await detectAndRecordFraudEvent({
    program: { id: link.programId },
    partner: pick(partner, ["id", "email", "name"]),
    programEnrollment: pick(programEnrollment, ["status"]),
    link: pick(link, ["id"]),
    click: pick(saleEvent, ["url", "referer"]),
    event: { id: saleEvent.event_id },
    customer: {
      ...pick(customer, ["id", "email", "name"]),
      isFirstConversion,
    },
  });
}

async function stepExecuteWorkflow({
  saleEvent,
  link,
  isFirstConversion,
}: StepFunctionInput & {
  isFirstConversion: boolean;
}) {
  if (!link.programId || !link.partnerId) {
    return;
  }

  const { workspace_id: workspaceId } = saleEvent;

  await executeWorkflows({
    trigger: "partnerMetricsUpdated",
    reason: "sale",
    identity: {
      workspaceId,
      programId: link.programId,
      partnerId: link.partnerId,
    },
    metrics: {
      current: {
        saleAmount: saleEvent.amount,
        conversions: isFirstConversion ? 1 : 0,
      },
    },
  });
}

function parseMetadata(metadata: string): Record<string, string> {
  try {
    return JSON.parse(metadata ?? {});
  } catch (error) {
    return {};
  }
}
