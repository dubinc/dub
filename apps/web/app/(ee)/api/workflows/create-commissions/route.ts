import { isFirstConversion } from "@/lib/analytics/is-first-conversion";
import { createId } from "@/lib/api/create-id";
import { getCustomerStripeInvoices } from "@/lib/api/customers/get-customer-stripe-invoices";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { Session } from "@/lib/auth";
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
};

type CustomerProps = Pick<
  Customer,
  "id" | "country" | "externalId" | "stripeCustomerId"
> & {
  isFirstConversion: boolean;
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

    // TODO:
    // Maybe combine 1 and 2?

    // Step 1: Resolve link
    const link = await context.run("resolve-link", async () => {
      return stepResolveLink({
        ...input,
        workspace,
        partner,
        links,
      });
    });

    // Step 2: Resolve customer
    const customer = await context.run("resolve-customer", async () => {
      return stepResolveCustomer({
        ...input,
        workspace,
        link,
      });
    });

    // Step 3: Record click, lead and sale events
    const { leadEvent, saleEvents } = await context.run(
      "record-events",
      async () => {
        return stepRecordEvents({
          ...input,
          workspace,
          link,
          customer,
        });
      },
    );

    // Step 4: Create commissions
    await context.run("create-commissions", async () => {
      return stepCreateCommissions({
        ...input,
        workspace,
        link,
        customer,
        leadEvent,
        saleEvents,
      });
    });

    // Step 5:  Sync link stats, customer stats
    // await context.run("update-stats", async () => {
    //   // return stepUpdateStats({
    //   //   ...input,
    //   //   workspace,
    //   //   link,
    //   //   customer,
    //   // });
    // });

    // // Step 6: Execute Dub workflow
    // await context.run("execute-dub-workflow", async () => {
    //   // return stepExecuteWorkflow({
    //   //   ...input,
    //   //   workspace,
    //   //   link,
    //   //   customer,
    //   // });
    // });
  },
  {
    initialPayloadParser: (requestPayload) => {
      return inputSchema.parse(JSON.parse(requestPayload));
    },
  },
);

async function stepResolveLink({
  body,
  links,
  partner,
}: StepFunctionInput & {
  partner: Pick<Partner, "id" | "email">;
  links: Pick<Link, "id" | "sales" | "url">[];
}) {
  // Just to make TypeScript happy
  if (body.type === "custom") {
    return;
  }

  if (links.length === 0) {
    throw new WorkflowNonRetryableError(
      `Partner ${partner.email} (${partner.id}) has no links.`,
    );
  }

  if (body.linkId) {
    const link = links.find((l) => l.id === body.linkId);

    if (!link) {
      throw new WorkflowNonRetryableError(
        `Link ${body.linkId} does not belong to partner ${partner.email} (${partner.id}).`,
      );
    }

    return {
      id: link.id,
      url: link.url,
    };
  }

  // If linkId is not provided, default to patner's link with most sales
  const link = links.sort((a, b) => b.sales - a.sales)[0];

  return {
    id: link.id,
    url: link.url,
  };
}

async function stepResolveCustomer({
  body,
  workspace,
  link,
}: StepFunctionInput & {
  link: Pick<Link, "id"> | undefined;
}) {
  // Just to make TypeScript happy
  if (body.type === "custom" || !link) {
    return;
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
        linkId: link.id,
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
      linkId: link.id,
    });

  return {
    id: customer.id,
    country: customer.country,
    externalId: customer.externalId,
    stripeCustomerId: customer.stripeCustomerId,
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
  link: Pick<Link, "id" | "url"> | undefined;
  customer: CustomerProps | undefined;
}) {
  // Just to make TypeScript happy
  if (body.type === "custom") {
    throw new WorkflowNonRetryableError(
      "Custom commissions are not supported.",
    );
  }

  if (!link || !customer) {
    throw new WorkflowNonRetryableError(
      "Failed to resolve link or customer from the request.",
    );
  }

  const finalLeadEventDate =
    body.type === "lead"
      ? body.leadEventDate ?? new Date()
      : body.saleEventDate ?? new Date();

  const leadEventName = body.type === "lead" ? body.leadEventName : "Sign Up";

  const clickId = nanoid(16);
  const clickedAt = new Date(finalLeadEventDate.getTime() - 5 * 60 * 1000);

  let saleEvents: z.infer<typeof saleEventSchemaTBWithTimestamp>[] = [];
  let stripeCustomerInvoices: Awaited<
    ReturnType<typeof getCustomerStripeInvoices>
  > = [];

  // Record click event
  const clickEvent = recordClickZodSchema.parse({
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
    event_name: leadEventName,
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

  await recordClickZod(clickEvent);

  await recordLeadWithTimestamp(leadEvent);

  if (saleEvents.length > 0) {
    await recordSaleWithTimestamp(saleEvents);
  }

  return {
    clickEvent: {
      id: clickEvent.click_id,
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
  userId,
  programId,
  leadEvent,
  saleEvents,
}: StepFunctionInput & {
  link: Pick<Link, "id"> | undefined;
  customer: CustomerProps | undefined;
  leadEvent: { id: string; timestamp: string };
  saleEvents: SaleEventProps[];
}) {
  const { partnerId } = body;

  if (!link || !customer) {
    throw new WorkflowNonRetryableError(
      "Failed to resolve link or customer from the request.",
    );
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new WorkflowNonRetryableError(`User ${userId} not found.`);
  }

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

  let commissions: Pick<
    Commission,
    "id" | "type" | "earnings" | "customerId" | "programId" | "partnerId"
  >[] = [];

  for (const commissionToCreate of commissionsToCreate) {
    const { commission } = await createPartnerCommission(commissionToCreate);

    if (commission) {
      commissions.push({
        id: commission.id,
        type: commission.type,
        earnings: commission.earnings,
        customerId: commission.customerId,
        programId: commission.programId,
        partnerId: commission.partnerId,
      });
    }
  }

  return {
    commissions,
  };

  // let totalSales = 0;
  // let totalSaleAmount = 0;
  // let lastLeadAt: Date | undefined = undefined;
  // let lastConversionAt: Date | undefined = undefined;

  // if (body.type === "lead") {
  //   lastLeadAt = new Date(leadEvent.timestamp);
  // } else if (body.type === "sale") {
  // }
}

async function stepUpdateStats({
  link,
  customer,
}: StepFunctionInput & {
  link: Pick<Link, "id" | "url" | "lastLeadAt"> | undefined;
  customer: CustomerProps | undefined;
}) {
  if (!link || !customer) {
    throw new WorkflowNonRetryableError(
      "Failed to resolve link or customer from the request.",
    );
  }

  //
}

async function stepExecuteWorkflow({}: StepFunctionInput & {
  link: Pick<Link, "id" | "url"> | undefined;
  customer: CustomerProps | undefined;
}) {
  //
}
