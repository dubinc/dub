/**
 * Backfills workspace (`Project`) billing fields from the platform Stripe account:
 * `planPeriod`, `subscriptionCanceledAt`, `billingCycleEndsAt`.
 *
 * Requires:
 * - `STRIPE_SECRET_KEY` (platform Stripe — same as webhooks)
 * - Database URL env vars as used elsewhere (`DATABASE_URL`, etc.)
 *
 *
 * Usage:
 *   pnpm exec tsx apps/web/scripts/migrations/backfill-workspace-stripe-billing-fields.ts
 *   pnpm exec tsx apps/web/scripts/migrations/backfill-workspace-stripe-billing-fields.ts --dry-run
 *   pnpm exec tsx apps/web/scripts/migrations/backfill-workspace-stripe-billing-fields.ts --limit 50
 *   pnpm exec tsx apps/web/scripts/migrations/backfill-workspace-stripe-billing-fields.ts --slug my-workspace --dry-run
 *   pnpm exec tsx apps/web/scripts/migrations/backfill-workspace-stripe-billing-fields.ts --project-id clxxx...
 */
import { prisma } from "@dub/prisma";
import type { PlanPeriod } from "@dub/prisma/client";
import { chunk } from "@dub/utils";
import "dotenv-flow/config";
import Stripe from "stripe";
import { getPlanPeriodFromStripeSubscription } from "../../app/(ee)/api/stripe/webhook/utils/stripe-plan-period";
import { stripe } from "../../lib/stripe";
import { getSubscriptionCancellationFields } from "../../lib/stripe/workspace-subscription-fields";

const SUBSCRIPTION_LIST_LIMIT = 100;
const PAGE_SIZE = 50;
const PARALLEL_BATCH = 8;
const BATCH_DELAY_MS = 150;

const STATUS_PRIORITY = [
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "canceled",
] as const;

function argValue(argv: string[], flag: string): string | undefined {
  const i = argv.indexOf(flag);
  if (i === -1) {
    return undefined;
  }
  const value = argv[i + 1];
  if (value == null || value === "" || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function parseArgs() {
  const argv = process.argv.slice(2);

  let limit: number | undefined;
  if (argv.includes("--limit")) {
    const rawLimit = argValue(argv, "--limit");
    const n = Number(rawLimit);
    if (!Number.isInteger(n) || n <= 0) {
      throw new Error("--limit must be a positive integer");
    }
    limit = n;
  }

  const slug = argv.includes("--slug") ? argValue(argv, "--slug") : undefined;
  const projectId = argv.includes("--project-id")
    ? argValue(argv, "--project-id")
    : undefined;

  return {
    dryRun: argv.includes("--dry-run"),
    limit,
    slug,
    projectId,
  };
}

function isStripeMissingCustomerError(e: unknown): boolean {
  if (e instanceof Stripe.errors.StripeInvalidRequestError) {
    return (
      e.code === "resource_missing" &&
      (e.param === "customer" || /no such customer/i.test(e.message))
    );
  }
  return e instanceof Error && /no such customer/i.test(e.message);
}

function pickSubscription(
  subscriptions: Stripe.Subscription[],
): Stripe.Subscription | null {
  if (subscriptions.length === 0) {
    return null;
  }
  for (const status of STATUS_PRIORITY) {
    const found = subscriptions.find((s) => s.status === status);
    if (found) {
      return found;
    }
  }
  return [...subscriptions].sort((a, b) => b.created - a.created)[0] ?? null;
}

async function listCustomerSubscriptions(
  customerId: string,
): Promise<Stripe.Subscription[]> {
  const subscriptions: Stripe.Subscription[] = [];
  let startingAfter: string | undefined;

  while (true) {
    const page = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: SUBSCRIPTION_LIST_LIMIT,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    subscriptions.push(...page.data);

    if (!page.has_more) {
      return subscriptions;
    }

    startingAfter = page.data[page.data.length - 1]?.id;
    if (!startingAfter) {
      return subscriptions;
    }
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sameInstant(
  a: Date | null | undefined,
  b: Date | null | undefined,
): boolean {
  if (a == null && b == null) {
    return true;
  }
  if (a == null || b == null) {
    return false;
  }
  return a.getTime() === b.getTime();
}

type ProjectBillingRow = {
  id: string;
  slug: string;
  stripeId: string | null;
  planPeriod: PlanPeriod | null;
  subscriptionCanceledAt: Date | null;
  billingCycleEndsAt: Date | null;
};

type BackfillCounters = {
  updated: number;
  skippedNoSubscription: number;
  failed: number;
};

async function backfillOneProject(
  project: ProjectBillingRow,
  dryRun: boolean,
  counters: BackfillCounters,
): Promise<void> {
  const customerId = project.stripeId;
  if (!customerId) {
    return;
  }

  try {
    const allSubscriptions = await listCustomerSubscriptions(customerId);
    const sub = pickSubscription(allSubscriptions);
    if (!sub) {
      console.log(
        `[skip] ${project.id} (${project.slug}): no subscription for customer ${customerId}`,
      );
      counters.skippedNoSubscription++;
      return;
    }

    const planPeriod: PlanPeriod | undefined =
      getPlanPeriodFromStripeSubscription(sub);
    const { subscriptionCanceledAt, billingCycleEndsAt } =
      getSubscriptionCancellationFields(sub);

    const nextData = {
      planPeriod,
      subscriptionCanceledAt,
      billingCycleEndsAt,
    };

    const planEqual =
      planPeriod === undefined || planPeriod === project.planPeriod;
    const noOp =
      planEqual &&
      sameInstant(subscriptionCanceledAt, project.subscriptionCanceledAt) &&
      sameInstant(billingCycleEndsAt, project.billingCycleEndsAt);

    if (dryRun) {
      console.log({
        id: project.id,
        slug: project.slug,
        dryRun: true,
        subscriptionId: sub.id,
        subStatus: sub.status,
        noOp,
        proposed: nextData,
        current: {
          planPeriod: project.planPeriod,
          subscriptionCanceledAt: project.subscriptionCanceledAt,
          billingCycleEndsAt: project.billingCycleEndsAt,
        },
      });
      return;
    }

    if (noOp) {
      return;
    }

    const data: {
      subscriptionCanceledAt: Date | null;
      billingCycleEndsAt: Date | null;
      planPeriod?: PlanPeriod;
    } = {
      subscriptionCanceledAt,
      billingCycleEndsAt,
    };
    if (planPeriod !== undefined) {
      data.planPeriod = planPeriod;
    }

    await prisma.project.update({
      where: { id: project.id },
      data,
    });
    counters.updated++;
    console.log(`[updated] ${project.id} (${project.slug}) sub=${sub.id}`);
  } catch (e) {
    if (isStripeMissingCustomerError(e)) {
      console.log(
        `[skip] ${project.id} (${project.slug}): Stripe customer not found (${customerId})`,
      );
      counters.skippedNoSubscription++;
      return;
    }
    counters.failed++;
    console.error(
      `[error] ${project.id} (${project.slug}):`,
      e instanceof Error ? e.message : e,
    );
  }
}

async function runProjectBatches(
  projects: ProjectBillingRow[],
  dryRun: boolean,
  counters: BackfillCounters,
  onBatchComplete: (batchSize: number) => void,
): Promise<void> {
  const batches = chunk(projects, PARALLEL_BATCH);
  for (const batch of batches) {
    await Promise.all(
      batch.map((project) => backfillOneProject(project, dryRun, counters)),
    );
    onBatchComplete(batch.length);
    await sleep(BATCH_DELAY_MS);
  }
}

async function main() {
  const { dryRun, limit, slug, projectId } = parseArgs();

  if (slug != null && projectId != null) {
    throw new Error("Use only one of --slug or --project-id");
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is required");
  }

  let processed = 0;
  let cursor: { id: string } | undefined;
  const counters: BackfillCounters = {
    updated: 0,
    skippedNoSubscription: 0,
    failed: 0,
  };

  /** Single-record mode: no cursor pagination */
  const scopedWhere =
    slug != null
      ? { slug, stripeId: { not: null } as const }
      : projectId != null
        ? { id: projectId, stripeId: { not: null } as const }
        : null;

  if (scopedWhere != null) {
    const projects = await prisma.project.findMany({
      where: scopedWhere,
      select: {
        id: true,
        slug: true,
        stripeId: true,
        planPeriod: true,
        subscriptionCanceledAt: true,
        billingCycleEndsAt: true,
      },
    });

    if (projects.length === 0) {
      console.log({
        done: true,
        dryRun,
        message: "No matching project (check slug/id and stripeId)",
        slug: slug ?? null,
        projectId: projectId ?? null,
      });
      return;
    }

    await runProjectBatches(projects, dryRun, counters, (n) => {
      processed += n;
    });

    console.log({
      done: true,
      dryRun,
      mode: "scoped",
      processed,
      updated: counters.updated,
      skippedNoSubscription: counters.skippedNoSubscription,
      failed: counters.failed,
      slug: slug ?? null,
      projectId: projectId ?? null,
    });
    if (counters.failed > 0) {
      throw new Error(
        `Backfill finished with ${counters.failed} project error(s); see [error] logs above.`,
      );
    }
    return;
  }

  while (true) {
    if (limit != null && processed >= limit) {
      break;
    }

    const take =
      limit != null ? Math.min(PAGE_SIZE, limit - processed) : PAGE_SIZE;
    if (take <= 0) {
      break;
    }

    const projects = await prisma.project.findMany({
      where: {
        stripeId: { not: null },
      },
      select: {
        id: true,
        slug: true,
        stripeId: true,
        planPeriod: true,
        subscriptionCanceledAt: true,
        billingCycleEndsAt: true,
      },
      take,
      skip: cursor ? 1 : 0,
      cursor,
      orderBy: { id: "asc" },
    });

    if (projects.length === 0) {
      break;
    }

    await runProjectBatches(projects, dryRun, counters, (n) => {
      processed += n;
    });

    cursor = { id: projects[projects.length - 1].id };
  }

  console.log({
    done: true,
    dryRun,
    mode: "full",
    processed,
    updated: counters.updated,
    skippedNoSubscription: counters.skippedNoSubscription,
    failed: counters.failed,
    limit: limit ?? null,
  });
  if (counters.failed > 0) {
    throw new Error(
      `Backfill finished with ${counters.failed} project error(s); see [error] logs above.`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
