import { triggerAggregateDueCommissionsCronJob } from "@/lib/actions/partners/trigger-aggregate-due-commissions";
import { isFirstConversion } from "@/lib/analytics/is-first-conversion";
import { createId } from "@/lib/api/create-id";
import { getCustomerStripeInvoices } from "@/lib/api/customers/get-customer-stripe-invoices";
import { updateLinkStatsForImporter } from "@/lib/api/links/update-link-stats-for-importer";
import { syncPartnerLinksStats } from "@/lib/api/partners/sync-partner-links-stats";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { executeWorkflows } from "@/lib/api/workflows/execute-workflows";
import { Session } from "@/lib/auth";
import { logger } from "@/lib/axiom/server";
import { generateRandomName } from "@/lib/names";
import {
  createPartnerCommission,
  CreatePartnerCommissionProps,
} from "@/lib/partners/create-partner-commission";
import { isStored, storage } from "@/lib/storage";
import {
  recordLeadWithTimestamp,
  recordSaleWithTimestamp,
} from "@/lib/tinybird";
import {
  recordClickZod,
  recordClickZodSchema,
} from "@/lib/tinybird/record-click-zod";
import { createCommissionBodySchema } from "@/lib/zod/schemas/commissions";
import { leadEventSchemaTB } from "@/lib/zod/schemas/leads";
import { saleEventSchemaTB } from "@/lib/zod/schemas/sales";
import { prisma } from "@dub/prisma";
import {
  Commission,
  CommissionType,
  Customer,
  Link,
  Partner,
  Project,
} from "@dub/prisma/client";
import { COUNTRIES_TO_CONTINENTS, nanoid, R2_URL } from "@dub/utils";
import { WorkflowNonRetryableError } from "@upstash/workflow";
import { serve } from "@upstash/workflow/nextjs";
import * as z from "zod/v4";

const inputSchema = z.object({
  body: createCommissionBodySchema.describe(
    "The original request body from POST /api/commissions.",
  ),
  programId: z.string(),
  userId: z.string(),
});

const leadEventSchemaTBWithTimestamp = leadEventSchemaTB.extend({
  timestamp: z.string(),
});

const saleEventSchemaTBWithTimestamp = saleEventSchemaTB.extend({
  timestamp: z.string(),
});

type Input = z.infer<typeof inputSchema>;

type StepFunctionInput = Input & {
  workspace: Pick<Project, "id" | "stripeConnectId">;
  link: Pick<
    Link,
    "id" | "url" | "lastLeadAt" | "lastConversionAt" | "programId" | "partnerId"
  >;
  customer: Pick<
    Customer,
    "id" | "country" | "externalId" | "stripeCustomerId" | "firstSaleAt"
  >;
};

type SaleEventProps = {
  id: string;
  timestamp: string;
  amount: number;
  currency: string;
  invoiceId: string;
  productId?: string;
  status?: "refunded";
};

// POST /api/workflows/create-commissions
export const { POST } = serve<Input>(
  async (context) => {
    const input = context.requestPayload;
    const { body, programId } = input;
    const { partnerId } = body;

    if (body.type === "custom") {
      throw new WorkflowNonRetryableError(
        "Custom commissions are not supported.",
      );
    }

    const program = await prisma.program.findUnique({
      where: {
        id: input.programId,
      },
      select: {
        id: true,
        workspace: {
          select: {
            id: true,
            stripeConnectId: true,
          },
        },
      },
    });

    if (!program) {
      throw new WorkflowNonRetryableError(`Program ${programId} not found.`);
    }

    const workspace = program.workspace;

    const { partner, links } = await getProgramEnrollmentOrThrow({
      programId,
      partnerId,
      include: {
        partner: true,
        links: true,
      },
    });

    // Step 1: Resolve link and customer
    const { link, customer, isFirstConversion } = await context.run(
      "resolve-link-and-customer",
      async () => {
        return stepResolveLinkAndCustomer({
          ...input,
          workspace,
          partner,
          links,
        });
      },
    );

    // Step 2: Record click, lead and sale events
    const { clickEvent, leadEvent, saleEvents } = await context.run(
      "record-events",
      async () => {
        return stepRecordEvents({
          ...input,
          workspace,
          link,
          customer,
          isFirstConversion,
        });
      },
    );

    // Step 3: Create commissions
    const {
      totalSales,
      totalSaleAmount,
      lastLeadAt,
      lastConversionAt,
      commissions,
    } = await context.run("create-commissions", async () => {
      return stepCreateCommissions({
        ...input,
        workspace,
        link,
        customer,
        leadEvent,
        saleEvents,
      });
    });

    // Step 4: Sync link stats, customer stats
    await context.run("update-stats", async () => {
      return stepUpdateStats({
        ...input,
        workspace,
        link,
        customer,
        clickEvent,
        totalSales,
        totalSaleAmount,
        lastLeadAt,
        lastConversionAt,
        isFirstConversion,
      });
    });

    // Step 5: Execute Dub workflow
    await context.run("execute-dub-workflow", async () => {
      return stepExecuteWorkflow({
        ...input,
        workspace,
        commissions,
        totalSaleAmount,
        isFirstConversion,
      });
    });
  },
  {
    initialPayloadParser: (requestPayload) => {
      return inputSchema.parse(JSON.parse(requestPayload));
    },
    failureFunction: async ({
      context,
      failStatus,
      failResponse,
      failHeaders,
    }) => {
      const { body, programId } = context.requestPayload;
      const { partnerId, type } = body;

      logger.error("workflow.failed", {
        service: "qstash",
        event: "workflow.failed",
        workflowType: "create-commissions",
        workflowRunId: context.workflowRunId,
        failStatus,
        failResponse,
        failHeaders,
        correlation: {
          programId,
          partnerId,
          type,
        },
      });

      await logger.flush();
    },
  },
);

async function stepResolveLinkAndCustomer({
  body,
  links,
  partner,
  workspace,
}: Omit<StepFunctionInput, "link" | "customer"> & {
  partner: Pick<Partner, "id" | "email">;
  links: Link[];
}) {
  // Just to make TypeScript happy
  if (body.type === "custom") {
    throw new WorkflowNonRetryableError(
      "Custom commissions are not supported.",
    );
  }

  if (links.length === 0) {
    throw new WorkflowNonRetryableError(
      `Partner ${partner.email} (${partner.id}) has no links.`,
    );
  }

  let resolvedLink: Link;

  if (body.linkId) {
    const link = links.find((l) => l.id === body.linkId);

    if (!link) {
      throw new WorkflowNonRetryableError(
        `Link ${body.linkId} does not belong to partner ${partner.email} (${partner.id}).`,
      );
    }

    resolvedLink = link;
  } else {
    // If linkId is not provided, default to patner's link with most sales
    resolvedLink = links.sort((a, b) => b.sales - a.sales)[0];
  }

  let customer: Customer | null = null;

  if (body.customerId) {
    customer = await prisma.customer.findUnique({
      where: {
        id: body.customerId,
      },
    });

    if (!customer) {
      throw new WorkflowNonRetryableError(
        `Customer ${body.customerId} not found.`,
      );
    }

    if (customer.projectId !== workspace.id) {
      throw new WorkflowNonRetryableError(
        `Customer ${body.customerId} does not belong to the workspace.`,
      );
    }
  }

  if (body.customer) {
    const { name, email, avatar, country, externalId, stripeCustomerId } =
      body.customer;

    const customerId = createId({ prefix: "cus_" });
    const finalCustomerName = name || email || generateRandomName();
    const finalCustomerAvatar =
      avatar && !isStored(avatar)
        ? `${R2_URL}/customers/${customerId}/avatar_${nanoid(7)}`
        : avatar;

    customer = await prisma.customer.upsert({
      where: {
        projectId_externalId: {
          projectId: workspace.id,
          externalId,
        },
      },
      create: {
        id: customerId,
        name: finalCustomerName,
        email,
        avatar: finalCustomerAvatar,
        externalId,
        stripeCustomerId,
        linkId: resolvedLink.id,
        country,
        projectId: workspace.id,
        projectConnectId: workspace.stripeConnectId,
      },
      update: {
        //
      },
    });

    if (avatar && !isStored(avatar) && finalCustomerAvatar) {
      await storage.upload({
        key: finalCustomerAvatar.replace(`${R2_URL}/`, ""),
        body: avatar,
        opts: {
          width: 128,
          height: 128,
        },
      });
    }
  }

  if (!customer) {
    throw new WorkflowNonRetryableError(
      "Failed to resolve customer from the request.",
    );
  }

  const firstConversionFlag =
    body.type === "sale" &&
    isFirstConversion({
      customer,
      linkId: resolvedLink.id,
    });

  return {
    link: {
      id: resolvedLink.id,
      url: resolvedLink.url,
      partnerId: resolvedLink.partnerId,
      programId: resolvedLink.programId,
      lastLeadAt: resolvedLink.lastLeadAt,
      lastConversionAt: resolvedLink.lastConversionAt,
      sales: resolvedLink.sales,
    },
    customer: {
      id: customer.id,
      country: customer.country,
      externalId: customer.externalId,
      stripeCustomerId: customer.stripeCustomerId,
      firstSaleAt: customer.firstSaleAt,
    },
    isFirstConversion: firstConversionFlag,
  };
}

async function stepRecordEvents({
  body,
  workspace,
  link,
  customer,
  programId,
}: StepFunctionInput & {
  isFirstConversion: boolean;
}) {
  if (body.type === "custom") {
    throw new WorkflowNonRetryableError(
      "Custom commissions are not supported.",
    );
  }

  const finalLeadEventDate =
    body.type === "lead"
      ? body.leadEventDate ?? new Date()
      : body.saleEventDate ?? new Date();

  const clickId = nanoid(16);
  let clickedAt = new Date(finalLeadEventDate.getTime() - 5 * 60 * 1000);
  const leadEventName = body.type === "lead" ? body.leadEventName : "Sign up";

  let saleEvents: z.infer<typeof saleEventSchemaTBWithTimestamp>[] = [];
  let stripeCustomerInvoices: Awaited<
    ReturnType<typeof getCustomerStripeInvoices>
  > = [];

  // Record click event
  let clickEvent = recordClickZodSchema.parse({
    timestamp: clickedAt.toISOString(),
    identity_hash: customer.externalId || customer.id,
    click_id: clickId,
    link_id: link.id,
    url: link.url,
    ip: "127.0.0.1",
    continent: customer.country
      ? COUNTRIES_TO_CONTINENTS[customer.country.toUpperCase()] || ""
      : "",
  });

  // Record lead event
  const leadEvent = leadEventSchemaTBWithTimestamp.parse({
    ...clickEvent,
    event_id: nanoid(16),
    event_name: leadEventName ?? "Sign up",
    customer_id: customer.id,
    timestamp: finalLeadEventDate.toISOString(),
  });

  // Record sale events
  if (body.type === "sale") {
    const {
      invoiceId,
      saleAmount,
      saleEventDate,
      productId,
      importStripeInvoices,
    } = body;

    // Import sales from Stripe invoices
    if (importStripeInvoices) {
      if (!workspace.stripeConnectId) {
        throw new WorkflowNonRetryableError(
          "Workspace isn't connected to Stripe yet.",
        );
      }

      if (!customer.stripeCustomerId) {
        throw new WorkflowNonRetryableError(
          "Customer doesn't have a Stripe customer ID.",
        );
      }

      stripeCustomerInvoices = await getCustomerStripeInvoices({
        stripeCustomerId: customer.stripeCustomerId,
        stripeConnectId: workspace.stripeConnectId,
        programId,
        limit: 50,
      });

      // Filter out invoices that are already associated with a commission on Dub
      stripeCustomerInvoices = stripeCustomerInvoices.filter(
        (invoice) => !invoice.dubCommissionId,
      );

      if (stripeCustomerInvoices.length === 0) {
        throw new WorkflowNonRetryableError(
          "No unimported Stripe invoices found for customer.",
        );
      }

      // Sort invoices by created date ascending
      stripeCustomerInvoices.sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      );

      saleEvents = stripeCustomerInvoices.map((invoice) =>
        saleEventSchemaTBWithTimestamp.parse({
          ...clickEvent,
          event_id: nanoid(16),
          invoice_id: invoice.id,
          event_name: "Invoice paid",
          amount: invoice.amount,
          customer_id: customer.id,
          payment_processor: "stripe",
          currency: "usd",
          timestamp: invoice.createdAt.toISOString(),
          metadata: JSON.stringify(invoice.metadata),
        }),
      );

      if (saleEvents.length > 0) {
        clickedAt = new Date(
          new Date(saleEvents[0].timestamp).getTime() - 5 * 60 * 1000,
        );
      }
    }

    // Prepare sale event if requested
    else if (saleAmount) {
      saleEvents = [
        saleEventSchemaTBWithTimestamp.parse({
          ...clickEvent,
          event_id: nanoid(16),
          invoice_id: invoiceId ?? "",
          event_name: "Purchase",
          amount: saleAmount,
          customer_id: customer.id,
          payment_processor: "custom",
          currency: "usd",
          timestamp: new Date(saleEventDate ?? Date.now()).toISOString(),
          metadata: productId ? JSON.stringify({ productId }) : undefined,
        }),
      ];
    }
  }

  clickEvent = {
    ...clickEvent,
    timestamp: clickedAt.toISOString(),
  };

  await recordClickZod(clickEvent);

  await recordLeadWithTimestamp(leadEvent);

  if (saleEvents.length > 0) {
    await recordSaleWithTimestamp(saleEvents);
  }

  return {
    clickEvent: {
      id: clickEvent.click_id,
      timestamp: clickEvent.timestamp,
    },
    leadEvent: {
      id: leadEvent.event_id,
      timestamp: leadEvent.timestamp,
    },
    saleEvents: saleEvents.map((saleEvent) => {
      const stripeInvoice = stripeCustomerInvoices.find(
        (invoice) => invoice.id === saleEvent.invoice_id,
      );

      const metadata = saleEvent.metadata
        ? JSON.parse(saleEvent.metadata)
        : undefined;

      return {
        id: saleEvent.event_id,
        timestamp: saleEvent.timestamp,
        amount: saleEvent.amount,
        currency: saleEvent.currency,
        invoiceId: saleEvent.invoice_id,
        productId: metadata?.productId,
        ...(stripeInvoice?.refunded && {
          status: "refunded" as const,
        }),
      };
    }),
  };
}

async function stepCreateCommissions({
  body,
  link,
  customer,
  leadEvent,
  saleEvents,
  userId,
  programId,
}: StepFunctionInput & {
  leadEvent: { id: string; timestamp: string };
  saleEvents: SaleEventProps[];
}) {
  const { partnerId } = body;

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new WorkflowNonRetryableError(`User ${userId} not found.`);
  }

  let commissions: Pick<Commission, "id" | "type" | "earnings" | "amount">[] =
    [];
  let lastLeadAt: Date | undefined = undefined;
  let lastConversionAt: Date | undefined = undefined;
  const commissionsToCreate: CreatePartnerCommissionProps[] = [];

  // Lead commission
  if (body.type === CommissionType.lead) {
    commissionsToCreate.push({
      event: CommissionType.lead,
      programId,
      partnerId,
      linkId: link.id,
      customerId: customer.id,
      eventId: leadEvent.id,
      quantity: 1,
      // we don't add the "Z" to the timestamp because it's already in UTC
      createdAt: new Date(leadEvent.timestamp),
      user: user as Session["user"],
      context: {
        customer: {
          country: customer.country,
        },
      },
    });
  }

  // Sale commissions
  else if (body.type === CommissionType.sale) {
    commissionsToCreate.push(
      ...saleEvents.map((saleEvent) => ({
        event: CommissionType.sale,
        programId,
        partnerId,
        linkId: link.id,
        customerId: customer.id,
        quantity: 1,
        eventId: saleEvent.id,
        amount: saleEvent.amount,
        currency: saleEvent.currency,
        invoiceId: saleEvent.invoiceId,
        // if the invoice payment was refunded on Stripe, set the commission status to refunded as well
        createdAt: new Date(saleEvent.timestamp),
        ...(saleEvent.status === "refunded" && {
          status: "refunded",
        }),
        user: user as Session["user"],
        context: {
          customer: {
            country: customer.country,
          },
          sale: {
            productId: saleEvent.productId,
          },
        },
      })),
    );
  }

  if (commissionsToCreate.length === 0) {
    throw new WorkflowNonRetryableError("No commissions to create.");
  }

  // Create commissions one by one
  for (const commissionToCreate of commissionsToCreate) {
    const { commission } = await createPartnerCommission(commissionToCreate);

    if (commission) {
      commissions.push({
        id: commission.id,
        type: commission.type,
        earnings: commission.earnings,
        amount: commission.amount,
      });
    }
  }

  const { totalSales, totalSaleAmount } = saleEvents.reduce(
    (acc, saleEvent) => {
      acc.totalSales++;
      acc.totalSaleAmount += saleEvent.amount;

      return acc;
    },
    {
      totalSales: 0,
      totalSaleAmount: 0,
    },
  );

  if (leadEvent) {
    lastLeadAt = new Date(leadEvent.timestamp);
  }

  if (saleEvents.length > 0) {
    lastLeadAt = new Date(saleEvents[0].timestamp);
    lastConversionAt = new Date(saleEvents[0].timestamp);
  }

  return {
    commissions,
    totalSales,
    totalSaleAmount,
    lastLeadAt,
    lastConversionAt,
  };
}

async function stepUpdateStats({
  link,
  customer,
  clickEvent,
  lastLeadAt,
  lastConversionAt,
  totalSales,
  totalSaleAmount,
  isFirstConversion,
}: StepFunctionInput & {
  clickEvent: { id: string; timestamp: string };
  lastLeadAt: Date | undefined;
  lastConversionAt: Date | undefined;
  totalSales: number;
  totalSaleAmount: number;
  isFirstConversion: boolean;
}) {
  await prisma.$transaction([
    prisma.link.update({
      where: {
        id: link.id,
      },
      data: {
        clicks: {
          increment: 1,
        },
        leads: {
          increment: 1,
        },
        lastLeadAt: updateLinkStatsForImporter({
          currentTimestamp: link.lastLeadAt,
          newTimestamp: lastLeadAt || new Date(),
        }),
        ...(isFirstConversion && {
          conversions: {
            increment: 1,
          },
          lastConversionAt: updateLinkStatsForImporter({
            currentTimestamp: link.lastConversionAt,
            newTimestamp: lastConversionAt || new Date(),
          }),
        }),
        sales: {
          increment: totalSales,
        },
        saleAmount: {
          increment: totalSaleAmount,
        },
      },
    }),

    prisma.customer.update({
      where: {
        id: customer.id,
      },
      data: {
        linkId: link.id,
        programId: link.programId,
        partnerId: link.partnerId,
        clickId: clickEvent.id,
        clickedAt: new Date(clickEvent.timestamp),
        sales: {
          increment: totalSales,
        },
        saleAmount: {
          increment: totalSaleAmount,
        },
        firstSaleAt: customer.firstSaleAt
          ? undefined
          : lastConversionAt ?? new Date(),
      },
    }),
  ]);
}

async function stepExecuteWorkflow({
  body,
  workspace,
  commissions,
  programId,
  totalSaleAmount,
  isFirstConversion,
}: Omit<StepFunctionInput, "link" | "customer"> & {
  commissions: Pick<Commission, "id">[];
  totalSaleAmount: number;
  isFirstConversion: boolean;
}) {
  if (body.type === "custom") {
    throw new WorkflowNonRetryableError(
      "Custom commissions are not supported.",
    );
  }

  const { partnerId, type } = body;

  if (commissions.length > 0) {
    await executeWorkflows({
      trigger: "partnerMetricsUpdated",
      reason: "commission",
      identity: {
        workspaceId: workspace.id,
        programId,
        partnerId,
      },
      metrics: {
        current: {
          leads: type === "lead" ? 1 : 0,
          saleAmount: totalSaleAmount,
          conversions: isFirstConversion ? 1 : 0,
        },
      },
    });
  }

  await syncPartnerLinksStats({
    partnerId,
    programId,
    eventType: type,
  });

  if (commissions.length > 0) {
    await triggerAggregateDueCommissionsCronJob(programId);
  }
}
