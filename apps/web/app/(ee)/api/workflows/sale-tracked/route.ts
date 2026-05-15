import { isFirstConversion } from "@/lib/analytics/is-first-conversion";
import { syncPartnerLinksStats } from "@/lib/api/partners/sync-partner-links-stats";
import {
  constructWebhookPartner,
  createPartnerCommission,
} from "@/lib/partners/create-partner-commission";
import { sendPartnerPostback } from "@/lib/postback/send-partner-postback";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { transformSaleEventData } from "@/lib/webhook/transform";
import { WebhookPartnerSchema } from "@/lib/zod/schemas/partners";
import { saleEventSchemaTB } from "@/lib/zod/schemas/sales";
import { prisma } from "@dub/prisma";
import { Link } from "@dub/prisma/client";
import { WorkflowNonRetryableError } from "@upstash/workflow";
import { serve } from "@upstash/workflow/nextjs";
import * as z from "zod/v4";

const inputSchema = z.object({
  saleEvent: saleEventSchemaTB.extend({
    timestamp: z.string(),
  }),
});

type Input = z.infer<typeof inputSchema>;

type StepFunctionProps = Input & {
  link: Pick<Link, "id" | "programId" | "partnerId">;
};

// POST /api/workflows/sale-tracked
export const { POST } = serve<Input>(
  async (context) => {
    const input = context.requestPayload;
    const { link_id: linkId } = input.saleEvent;

    const link = await prisma.link.findUnique({
      where: {
        id: linkId,
      },
      select: {
        id: true,
        programId: true,
        partnerId: true,
      },
    });

    if (!link) {
      throw new WorkflowNonRetryableError(`Link ${linkId} not found.`);
    }

    // Step 1:  Sync link stats, customer stats, workspace usage, and program/partner associations
    await context.run("update-stats", async () => {
      await stepUpdateStats({
        ...input,
        link,
      });
    });

    // Step 2:  Create partner commission

    if (link.programId && link.partnerId) {
      await context.run("create-commission", async () => {
        await stepCreateCommission({
          ...input,
          link,
        });
      });
    }

    // Step 3: Send webhooks
    await context.run("send-webhooks", async () => {
      await stepSendWebhooks({
        ...input,
        link,
      });
    });

    // Step 4: Run fraud detection
    await context.run("run-fraud-detection", async () => {
      await stepRunFraudDetection({
        ...input,
        link,
      });
    });
  },
  {
    initialPayloadParser: (input) => inputSchema.parse(JSON.parse(input)),
  },
);

// TODO:
// Make sure individual steps are idempotent
// Step : Execute workflows (?)

async function stepUpdateStats({ saleEvent, link }: StepFunctionProps) {
  const {
    workspace_id: workspaceId,
    customer_id: customerId,
    amount,
  } = saleEvent;

  // TODO:
  // Use transaction (?)
  // Check firstConversionFlag working correctly

  const customer = await prisma.customer.findUniqueOrThrow({
    where: {
      id: customerId,
    },
    select: {
      id: true,
      sales: true,
      linkId: true,
      firstSaleAt: true,
    },
  });

  const firstConversionFlag = isFirstConversion({
    customer,
    linkId: link.id,
  });

  await prisma.link.update({
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
  });

  await prisma.project.update({
    where: {
      id: workspaceId,
    },
    data: {
      usage: {
        increment: 1,
      },
    },
  });

  await prisma.customer.update({
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
  });

  if (link.programId && link.partnerId) {
    await syncPartnerLinksStats({
      partnerId: link.partnerId,
      programId: link.programId,
      eventType: "sale",
    });
  }
}

async function stepCreateCommission({ saleEvent, link }: StepFunctionProps) {
  if (!link.programId || !link.partnerId) {
    return;
  }

  const {
    invoice_id: invoiceId,
    event_id: eventId,
    customer_id: customerId,
    currency,
    amount,
  } = saleEvent;

  const metadata = parseMetadata(saleEvent.metadata);

  const customer = await prisma.customer.findUniqueOrThrow({
    where: {
      id: customerId,
    },
    select: {
      country: true,
      createdAt: true,
    },
  });

  await createPartnerCommission({
    event: "sale",
    programId: link.programId,
    partnerId: link.partnerId,
    linkId: link.id,
    customerId,
    eventId,
    amount,
    quantity: 1,
    invoiceId,
    currency,
    context: {
      customer: {
        country: customer.country,
        signupDate: customer.createdAt,
        source: "tracked",
      },
      sale: {
        productId: metadata?.productId,
        amount,
      },
    },
  });
}

async function stepSendWebhooks({ saleEvent, link }: StepFunctionProps) {
  const { customer_id: customerId } = saleEvent;

  let webhookPartner: z.infer<typeof WebhookPartnerSchema> | undefined;

  const { project: workspace, ...customer } =
    await prisma.customer.findUniqueOrThrow({
      where: {
        id: customerId,
      },
      select: {
        country: true,
        createdAt: true,
        clickedAt: true,
        project: {
          select: {
            id: true,
            webhookEnabled: true,
          },
        },
      },
    });

  // Find the partner for the program's link
  if (link.programId && link.partnerId) {
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
    sendPartnerPostback({
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

async function stepRunFraudDetection({ saleEvent, link }: StepFunctionProps) {
  // TODO:
  // Run detectAndRecordFraudEvent
}

function parseMetadata(metadata: string): Record<string, string> {
  try {
    return JSON.parse(metadata ?? {});
  } catch (error) {
    return {};
  }
}
