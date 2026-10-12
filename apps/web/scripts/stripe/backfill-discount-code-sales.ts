import { DiscountCode } from "@prisma/client";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";
import * as path from "path";
import type Stripe from "stripe";
import { fileURLToPath } from "url";
import { getDubCustomerExternalIdFromMetadata } from "../../app/(ee)/api/stripe/integration/webhook/utils/get-dub-customer-external-id-from-metadata";
import { getPromotionCode } from "../../app/(ee)/api/stripe/integration/webhook/utils/get-promotion-code";
import { createManualCommissions } from "../../lib/api/commissions/create-manual-commissions";
import { prisma } from "../../lib/prisma";
import { stripeAppClient } from "../../lib/stripe";
import { StripeMode } from "../../lib/types";
import { createManualCommissionBodySchema } from "../../lib/zod/schemas/commissions";

// Backfills partner sales that the Stripe webhooks skipped before #4609.
// When the connected customer had a dubCustomerExternalId that matched no Dub customer,
// the webhooks returned early and never checked the partner discount code.
// Only subscriptions created on or after START_DATE that used a valid (not disabled) Dub discount code.
// Only the Stripe customers in beehiiv_customer_ids.csv are checked.
// Each match is appended to discount-code-sale-candidates.csv, and every checked id is appended to
// discount-code-sale-scanned.csv. Re-running resumes from those files instead of scanning Stripe again.
// Delete both CSVs to start over. Run this after #4609 is deployed. Set DRY_RUN to false to create the commissions.

const WORKSPACE_ID = "ws_xxx";
const USER_ID = "user_xxx"; // saved as the user who created the commissions
const START_DATE = new Date("2026-05-01T00:00:00.000Z"); // after the workspace moved to Dub
const STRIPE_MODE: StripeMode = "live";
const DRY_RUN = false;
// First N rows of discount-code-sale-candidates.csv. Set to null to backfill every saved candidate.
const CANDIDATE_LIMIT: number | null = null;

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const CUSTOMER_IDS_CSV = path.join(SCRIPT_DIR, "beehiiv_customer_ids.csv");
const CANDIDATES_CSV = path.join(
  SCRIPT_DIR,
  "discount-code-sale-candidates.csv",
);
const SCANNED_CUSTOMER_IDS_CSV = path.join(
  SCRIPT_DIR,
  "discount-code-sale-scanned.csv",
);

type Candidate = {
  discountCode: DiscountCode;
  subscriptionId: string;
  firstInvoiceCreated: number;
};

type CandidateRow = {
  stripeCustomerId: string;
  code: string;
  partnerId: string;
  subscriptionId: string;
  firstInvoiceCreated: string;
};

type LookupCaches = {
  codesByPromotionCodeId: Map<string, string | null>;
  discountCodesByCode: Map<string, DiscountCode | null>;
  createdBySubscriptionId: Map<string, number>;
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

  const customerIds = readCustomerIds();

  const candidates = await findCandidates({
    stripe,
    stripeConnectId,
    programId,
    customerIds,
  });

  const candidatesToBackfill =
    CANDIDATE_LIMIT == null
      ? [...candidates]
      : [...candidates].slice(0, CANDIDATE_LIMIT);

  console.log(
    `Backfilling ${candidatesToBackfill.length} of ${candidates.size} Stripe customers with a Dub discount code since ${START_DATE.toISOString()}`,
  );

  const results: Result[] = [];

  for (const [stripeCustomerId, candidate] of candidatesToBackfill) {
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

// Find the first paid subscription invoice with a valid Dub discount code for each Beehiiv customer.
// We check the invoices, not the subscriptions, because a repeating discount
// (e.g. "20% off for 3 months") is removed from the subscription when it ends.
// Matches are appended to CANDIDATES_CSV as they are found so a crash can resume from disk.
async function findCandidates({
  stripe,
  stripeConnectId,
  programId,
  customerIds,
}: {
  stripe: Stripe;
  stripeConnectId: string;
  programId: string;
  customerIds: string[];
}) {
  const candidates = await loadPersistedCandidates(programId);
  const scannedIds = readScannedCustomerIds();
  const remaining = customerIds.filter(
    (stripeCustomerId) =>
      !scannedIds.has(stripeCustomerId) && !candidates.has(stripeCustomerId),
  );

  console.log(
    `Checking ${customerIds.length} Beehiiv customers (${scannedIds.size} already scanned, ${candidates.size} already saved to ${CANDIDATES_CSV})`,
  );

  const caches: LookupCaches = {
    codesByPromotionCodeId: new Map(),
    discountCodesByCode: new Map(),
    createdBySubscriptionId: new Map(),
  };

  for (const [index, stripeCustomerId] of remaining.entries()) {
    const candidate = await findCandidateForCustomer({
      stripe,
      stripeConnectId,
      programId,
      stripeCustomerId,
      caches,
    });

    if (candidate) {
      candidates.set(stripeCustomerId, candidate);
      appendCsvRows(CANDIDATES_CSV, [
        {
          stripeCustomerId,
          code: candidate.discountCode.code,
          partnerId: candidate.discountCode.partnerId,
          subscriptionId: candidate.subscriptionId,
          firstInvoiceCreated: candidate.firstInvoiceCreated,
        },
      ]);
      console.log({
        stripeCustomerId,
        code: candidate.discountCode.code,
        partnerId: candidate.discountCode.partnerId,
        subscriptionId: candidate.subscriptionId,
        firstInvoiceCreated: candidate.firstInvoiceCreated,
      });
    }

    appendCsvRows(SCANNED_CUSTOMER_IDS_CSV, [{ id: stripeCustomerId }]);
    scannedIds.add(stripeCustomerId);

    if ((index + 1) % 100 === 0 || index + 1 === remaining.length) {
      console.log(
        `Scanned ${scannedIds.size}/${customerIds.length} Beehiiv customers, ${candidates.size} relevant`,
      );
    }
  }

  return candidates;
}

async function findCandidateForCustomer({
  stripe,
  stripeConnectId,
  programId,
  stripeCustomerId,
  caches,
}: {
  stripe: Stripe;
  stripeConnectId: string;
  programId: string;
  stripeCustomerId: string;
  caches: LookupCaches;
}) {
  let candidate: Candidate | null = null;

  for await (const invoice of stripe.invoices.list(
    {
      customer: stripeCustomerId,
      status: "paid",
      created: {
        gte: toUnix(START_DATE),
      },
      limit: 100,
      expand: ["data.discounts", "data.lines.data.discounts"],
    },
    {
      stripeAccount: stripeConnectId,
    },
  )) {
    const subscription = invoice.parent?.subscription_details?.subscription;
    const subscriptionId =
      typeof subscription === "string" ? subscription : subscription?.id;

    const promotionCodeId = getPromotionCodeId(invoice);

    if (!subscriptionId || !promotionCodeId) {
      continue;
    }

    if (!caches.codesByPromotionCodeId.has(promotionCodeId)) {
      const promotionCode = await getPromotionCode({
        promotionCodeId,
        stripeAccountId: stripeConnectId,
        mode: STRIPE_MODE,
      });

      caches.codesByPromotionCodeId.set(
        promotionCodeId,
        promotionCode?.code ?? null,
      );
    }

    const code = caches.codesByPromotionCodeId.get(promotionCodeId);

    if (!code) {
      continue;
    }

    if (!caches.discountCodesByCode.has(code)) {
      const discountCode = await prisma.discountCode.findUnique({
        where: {
          programId_code: {
            programId,
            code,
          },
        },
      });

      caches.discountCodesByCode.set(code, discountCode);
    }

    const discountCode = caches.discountCodesByCode.get(code);

    if (!discountCode || discountCode.disabledAt) {
      continue;
    }

    if (!caches.createdBySubscriptionId.has(subscriptionId)) {
      const { created } = await stripe.subscriptions.retrieve(
        subscriptionId,
        {},
        {
          stripeAccount: stripeConnectId,
        },
      );

      caches.createdBySubscriptionId.set(subscriptionId, created);
    }

    if (
      caches.createdBySubscriptionId.get(subscriptionId)! < toUnix(START_DATE)
    ) {
      continue;
    }

    if (!candidate || invoice.created < candidate.firstInvoiceCreated) {
      candidate = {
        discountCode,
        subscriptionId,
        firstInvoiceCreated: invoice.created,
      };
    }
  }

  return candidate;
}

function readCustomerIds() {
  if (!fs.existsSync(CUSTOMER_IDS_CSV)) {
    throw new Error(`Beehiiv customer CSV not found: ${CUSTOMER_IDS_CSV}`);
  }

  const ids = [
    ...new Set(
      readCsv<{ id: string }>(CUSTOMER_IDS_CSV)
        .map((row) => row.id?.trim())
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  if (ids.length === 0) {
    throw new Error(`No customer ids found in ${CUSTOMER_IDS_CSV}`);
  }

  return ids;
}

function readScannedCustomerIds() {
  return new Set(
    readCsv<{ id: string }>(SCANNED_CUSTOMER_IDS_CSV)
      .map((row) => row.id?.trim())
      .filter((id): id is string => Boolean(id)),
  );
}

async function loadPersistedCandidates(programId: string) {
  const rows = readCsv<CandidateRow>(CANDIDATES_CSV);
  const candidates = new Map<string, Candidate>();

  if (rows.length === 0) {
    return candidates;
  }

  const discountCodes = await prisma.discountCode.findMany({
    where: {
      programId,
      code: {
        in: [...new Set(rows.map((row) => row.code))],
      },
    },
  });
  const discountCodesByCode = new Map(
    discountCodes.map((discountCode) => [discountCode.code, discountCode]),
  );

  for (const row of rows) {
    const discountCode = discountCodesByCode.get(row.code);
    const firstInvoiceCreated = Number(row.firstInvoiceCreated);

    if (
      !discountCode ||
      !row.subscriptionId ||
      !Number.isFinite(firstInvoiceCreated)
    ) {
      throw new Error(
        `Invalid candidate row for ${row.stripeCustomerId || "(missing id)"} in ${CANDIDATES_CSV}`,
      );
    }

    candidates.set(row.stripeCustomerId, {
      discountCode,
      subscriptionId: row.subscriptionId,
      firstInvoiceCreated,
    });
  }

  console.log(
    `Loaded ${candidates.size} relevant customers from ${CANDIDATES_CSV}`,
  );

  return candidates;
}

function readCsv<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const parsed = Papa.parse<T>(fs.readFileSync(filePath, "utf-8"), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) =>
      header
        .trim()
        .replace(/^\uFEFF/, "")
        .replace(/^["']|["']$/g, ""),
  });

  const fatalErrors = parsed.errors.filter(
    (error) => error.code !== "UndetectableDelimiter",
  );

  if (fatalErrors.length > 0) {
    throw new Error(
      `Failed to parse ${filePath}: ${fatalErrors.map((error) => error.message).join(", ")}`,
    );
  }

  return parsed.data;
}

function appendCsvRows(
  filePath: string,
  rows: Record<string, string | number>[],
) {
  const fileExists = fs.existsSync(filePath) && fs.statSync(filePath).size > 0;

  fs.appendFileSync(
    filePath,
    Papa.unparse(rows, {
      header: !fileExists,
      newline: "\n",
    }) + "\n",
  );
}

function toUnix(date: Date) {
  return Math.floor(date.getTime() / 1000);
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
  subscriptionId,
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

  // After the first attribution, the webhook records every later invoice, also after the discount ends.
  // So we import the first discounted invoice of the subscription and every paid invoice after it.
  const { data: invoices } = await stripe.invoices.list(
    {
      customer: stripeCustomerId,
      subscription: subscriptionId,
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

  if (DRY_RUN) {
    return { ...result, status: "dry run" };
  }

  try {
    const body = createManualCommissionBodySchema.parse({
      type: "sale",
      partnerId: discountCode.partnerId,
      discountCode: discountCode.code,
      stripeInvoicesToImport: invoicesToImport.map((invoice) => invoice.id!),
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
