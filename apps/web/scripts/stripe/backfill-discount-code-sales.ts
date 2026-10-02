import { createManualCommissions } from "@/lib/api/commissions/create-manual-commissions";
import { prisma } from "@/lib/prisma";
import { stripeAppClient } from "@/lib/stripe";
import { StripeMode } from "@/lib/types";
import { createManualCommissionBodySchema } from "@/lib/zod/schemas/commissions";
import { DiscountCode } from "@prisma/client";
import "dotenv-flow/config";
import type Stripe from "stripe";
import { getDubCustomerExternalIdFromMetadata } from "../../app/(ee)/api/stripe/integration/webhook/utils/get-dub-customer-external-id-from-metadata";
import { getPromotionCode } from "../../app/(ee)/api/stripe/integration/webhook/utils/get-promotion-code";

// Backfills partner sales that the Stripe webhooks skipped before #4609.
// When the connected customer had a dubCustomerExternalId that matched no Dub customer,
// the webhooks returned early and never checked the partner discount code.
// Run this after #4609 is deployed. Set DRY_RUN to false to create the commissions.

const WORKSPACE_ID = "ws_xxx";
const USER_ID = "user_xxx"; // saved as the user who created the commissions
const START_DATE = new Date("2026-06-01T00:00:00.000Z"); // invoice.paid started to attribute discount codes (#3970)
const STRIPE_MODE: StripeMode = "live";
const DRY_RUN = true;

type Candidate = {
  discountCode: DiscountCode;
  firstInvoiceCreated: number;
};

type Result = {
  stripeCustomerId: string;
  dubCustomerExternalId?: string;
  discountCode: string;
  invoices: number;
  amount: number;
  status: "imported" | "dry run" | "skipped" | "review" | "failed";
  reason?: string;
};

async function main() {
  const workspace = await prisma.project.findUniqueOrThrow({
    where: {
      id: WORKSPACE_ID,
    },
    select: {
      id: true,
      slug: true,
      stripeConnectId: true,
      defaultProgramId: true,
    },
  });

  const { stripeConnectId, defaultProgramId: programId } = workspace;

  if (!stripeConnectId || !programId) {
    throw new Error(
      `Workspace ${workspace.id} has no Stripe account or default program.`,
    );
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: {
      id: USER_ID,
    },
    select: {
      id: true,
      name: true,
      email: true,
      isMachine: true,
    },
  });

  const stripe = stripeAppClient({ mode: STRIPE_MODE });

  const candidates = await findCandidates({
    stripe,
    stripeConnectId,
    programId,
  });

  console.log(
    `Found ${candidates.size} Stripe customers with a Dub discount code since ${START_DATE.toISOString()}`,
  );

  const results: Result[] = [];

  for (const [stripeCustomerId, candidate] of candidates) {
    const result = await backfillCustomer({
      stripe,
      workspace: {
        id: workspace.id,
        slug: workspace.slug,
        stripeConnectId,
      },
      programId,
      user: {
        id: user.id,
        name: user.name ?? "",
        email: user.email ?? "",
        isMachine: user.isMachine,
      },
      stripeCustomerId,
      ...candidate,
    });

    console.log(result);
    results.push(result);
  }

  console.table(results);
}

// Find the first paid invoice with a Dub discount code for each Stripe customer
async function findCandidates({
  stripe,
  stripeConnectId,
  programId,
}: {
  stripe: Stripe;
  stripeConnectId: string;
  programId: string;
}) {
  const codesByPromotionCodeId = new Map<string, string | null>();
  const discountCodesByCode = new Map<string, DiscountCode | null>();
  const candidates = new Map<string, Candidate>();

  for await (const invoice of stripe.invoices.list(
    {
      status: "paid",
      created: {
        gte: Math.floor(START_DATE.getTime() / 1000),
      },
      limit: 100,
      expand: ["data.discounts", "data.lines.data.discounts"],
    },
    {
      stripeAccount: stripeConnectId,
    },
  )) {
    const stripeCustomerId =
      typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer?.id;

    const promotionCodeId = getPromotionCodeId(invoice);

    if (!stripeCustomerId || !promotionCodeId) {
      continue;
    }

    if (!codesByPromotionCodeId.has(promotionCodeId)) {
      const promotionCode = await getPromotionCode({
        promotionCodeId,
        stripeAccountId: stripeConnectId,
        mode: STRIPE_MODE,
      });

      codesByPromotionCodeId.set(promotionCodeId, promotionCode?.code ?? null);
    }

    const code = codesByPromotionCodeId.get(promotionCodeId);

    if (!code) {
      continue;
    }

    if (!discountCodesByCode.has(code)) {
      const discountCode = await prisma.discountCode.findUnique({
        where: {
          programId_code: {
            programId,
            code,
          },
        },
      });

      discountCodesByCode.set(code, discountCode);
    }

    const discountCode = discountCodesByCode.get(code);

    if (!discountCode) {
      continue;
    }

    const candidate = candidates.get(stripeCustomerId);

    if (!candidate || invoice.created < candidate.firstInvoiceCreated) {
      candidates.set(stripeCustomerId, {
        discountCode,
        firstInvoiceCreated: invoice.created,
      });
    }
  }

  return candidates;
}

function getPromotionCodeId(invoice: Stripe.Invoice) {
  const discounts = [
    ...(invoice.discounts ?? []),
    ...invoice.lines.data.flatMap((line) => line.discounts ?? []),
  ];

  for (const discount of discounts) {
    if (typeof discount === "string" || !discount.promotion_code) {
      continue;
    }

    return typeof discount.promotion_code === "string"
      ? discount.promotion_code
      : discount.promotion_code.id;
  }

  return null;
}

async function backfillCustomer({
  stripe,
  workspace,
  programId,
  user,
  stripeCustomerId,
  discountCode,
  firstInvoiceCreated,
}: Candidate & {
  stripe: Stripe;
  workspace: { id: string; slug: string; stripeConnectId: string };
  programId: string;
  user: { id: string; name: string; email: string; isMachine: boolean };
  stripeCustomerId: string;
}): Promise<Result> {
  const result: Result = {
    stripeCustomerId,
    discountCode: discountCode.code,
    invoices: 0,
    amount: 0,
    status: "skipped",
  };

  // After the first attribution, the webhook records every later invoice of the customer.
  // So we import the first discounted invoice and every paid invoice after it.
  const { data: invoices } = await stripe.invoices.list(
    {
      customer: stripeCustomerId,
      status: "paid",
      limit: 100,
    },
    {
      stripeAccount: workspace.stripeConnectId,
    },
  );

  const invoicesToImport = invoices.filter(
    (invoice) =>
      invoice.id &&
      invoice.created >= firstInvoiceCreated &&
      invoice.amount_paid > 0,
  );

  result.invoices = invoicesToImport.length;
  result.amount = invoicesToImport.reduce(
    (sum, invoice) => sum + invoice.amount_paid,
    0,
  );

  if (invoicesToImport.length === 0) {
    return { ...result, reason: "No paid invoices above 0" };
  }

  // The Stripe invoice import saves the amounts as USD without conversion
  if (invoicesToImport.some((invoice) => invoice.currency !== "usd")) {
    return { ...result, status: "review", reason: "Has non-USD invoices" };
  }

  const customerWithStripeId = await prisma.customer.findUnique({
    where: {
      stripeCustomerId,
    },
  });

  if (customerWithStripeId) {
    const commissionCount = await prisma.commission.count({
      where: {
        programId,
        invoiceId: {
          in: invoicesToImport.map((invoice) => invoice.id!),
        },
      },
    });

    if (commissionCount === invoicesToImport.length) {
      return { ...result, reason: "Already attributed on Dub" };
    }

    // For example, the fixed webhook attributed a newer invoice before this script ran
    return {
      ...result,
      status: "review",
      reason: `Customer ${customerWithStripeId.id} exists on Dub, but ${invoicesToImport.length - commissionCount} invoices have no commission`,
    };
  }

  const connectedCustomer = await stripe.customers.retrieve(stripeCustomerId, {
    stripeAccount: workspace.stripeConnectId,
  });

  if (connectedCustomer.deleted) {
    return { ...result, reason: "Stripe customer is deleted" };
  }

  const dubCustomerExternalId = getDubCustomerExternalIdFromMetadata(
    connectedCustomer.metadata,
  );

  // Without a dubCustomerExternalId, the webhooks already checked the discount code,
  // so the early return did not affect this customer.
  if (!dubCustomerExternalId) {
    return { ...result, reason: "No dubCustomerExternalId on Stripe customer" };
  }

  result.dubCustomerExternalId = dubCustomerExternalId;

  const customerWithExternalId = await prisma.customer.findUnique({
    where: {
      projectId_externalId: {
        projectId: workspace.id,
        externalId: dubCustomerExternalId,
      },
    },
  });

  // This customer probably has a lead already, maybe from another partner
  if (customerWithExternalId) {
    return {
      ...result,
      status: "review",
      reason: `Customer ${customerWithExternalId.id} has this externalId but no stripeCustomerId`,
    };
  }

  if (discountCode.disabledAt) {
    return { ...result, status: "review", reason: "Discount code is disabled" };
  }

  if (DRY_RUN) {
    return { ...result, status: "dry run" };
  }

  try {
    const body = createManualCommissionBodySchema.parse({
      type: "sale",
      partnerId: discountCode.partnerId,
      discountCode: discountCode.code,
      importStripeInvoices: true,
      customer: {
        externalId: dubCustomerExternalId,
        stripeCustomerId,
        name: connectedCustomer.name,
        email: connectedCustomer.email,
        country:
          connectedCustomer.address?.country ??
          invoicesToImport[0].customer_address?.country ??
          "",
      },
    });

    await createManualCommissions({
      ...body,
      workspace,
      programId,
      user,
      stripeInvoiceIds: invoicesToImport.map((invoice) => invoice.id!),
    });

    return { ...result, status: "imported" };
  } catch (error) {
    return {
      ...result,
      status: "failed",
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

main();
