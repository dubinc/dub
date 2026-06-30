import { bulkCreateLinks } from "@/lib/api/links";
import { prisma } from "@/lib/prisma";
import { ProcessedLinkProps } from "@/lib/types";
import { nanoid } from "@dub/utils";
import { Link, Prisma } from "@prisma/client";
import { readFileSync } from "fs";

export const PROGRAM_ID = "prog_xxx";
export const PROGRAM_DOMAIN = "xxx.com";

export const TARGET_LINK_ID = "link_xxx"; // the colliding link to clean up
export const TARGET_DISCOUNT_CODE = "xxx"; // the discount code to re-point ("" to skip)

export const DRY_RUN =
  !process.argv.includes("--apply") && process.env.APPLY !== "1";

// Reads a `--name=value` CLI argument.
export function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv
    .find((arg) => arg.startsWith(prefix))
    ?.slice(prefix.length);
}

export function getCsvPath(): string {
  return (
    getArg("csv") || process.env.CROSSREF_CSV || "/attribution-mismatches.csv"
  );
}

// ---------------------------------------------------------------------------
// CSV parsing
// ---------------------------------------------------------------------------

export interface CrossrefRow {
  stripeCustomerId: string;
  customerEmail: string;
  rewardfulAffiliateEmail: string;
  dubPartnerEmail: string;
}

export function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (inQuotes) {
      if (char === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

export function loadCrossref(csvPath: string): CrossrefRow[] {
  const content = readFileSync(csvPath, "utf-8");
  const [header, ...dataRows] = parseCsv(content);

  if (!header || header.length === 0) {
    throw new Error(`Crossref CSV is empty or has no header: ${csvPath}`);
  }

  const normalized = header.map((h) => h.trim().toLowerCase());
  const columnIndex = (name: string): number => {
    const idx = normalized.indexOf(name.toLowerCase());
    if (idx === -1) {
      throw new Error(
        `Crossref CSV is missing the "${name}" column. Found: [${header.join(", ")}]`,
      );
    }
    return idx;
  };

  const stripeIdx = columnIndex("Stripe Customer ID");
  const customerEmailIdx = columnIndex("Customer Email");
  const affiliateEmailIdx = columnIndex("Rewardful Affiliate Email");
  const partnerEmailIdx = columnIndex("Dub Partner Email");

  return dataRows
    .filter((r) => r[stripeIdx]?.startsWith("cus_"))
    .map((r) => ({
      stripeCustomerId: r[stripeIdx].trim(),
      customerEmail: (r[customerEmailIdx] || "").trim(),
      rewardfulAffiliateEmail: (r[affiliateEmailIdx] || "")
        .trim()
        .toLowerCase(),
      dubPartnerEmail: (r[partnerEmailIdx] || "").trim().toLowerCase(),
    }));
}

export function buildOwnerMap(rows: CrossrefRow[]): Map<string, string> {
  const byCustomer = new Map<string, Map<string, number>>();

  for (const row of rows) {
    if (!row.stripeCustomerId || !row.rewardfulAffiliateEmail) continue;

    if (!byCustomer.has(row.stripeCustomerId)) {
      byCustomer.set(row.stripeCustomerId, new Map());
    }

    const counts = byCustomer.get(row.stripeCustomerId)!;
    counts.set(
      row.rewardfulAffiliateEmail,
      (counts.get(row.rewardfulAffiliateEmail) ?? 0) + 1,
    );
  }

  const ownerMap = new Map<string, string>();

  for (const [customerId, counts] of byCustomer) {
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);

    const topCount = sorted[0][1];
    const tiedTopOwners = sorted.filter(([, count]) => count === topCount);

    if (tiedTopOwners.length > 1) {
      console.warn(
        `⚠️  Customer ${customerId} has an ambiguous affiliate owner (tie between ${tiedTopOwners
          .map(([email]) => email)
          .join(", ")}); skipping reassignment.`,
      );
      continue;
    }

    if (sorted.length > 1) {
      console.warn(
        `⚠️  Customer ${customerId} maps to multiple affiliates: ${sorted
          .map(([email, count]) => `${email}(${count})`)
          .join(", ")} — using "${sorted[0][0]}".`,
      );
    }

    ownerMap.set(customerId, sorted[0][0]);
  }

  return ownerMap;
}

// ---------------------------------------------------------------------------
// Partner + link resolution
// ---------------------------------------------------------------------------

const partnerCache = new Map<string, string | null>();

export async function resolvePartnerId(email: string): Promise<string | null> {
  if (partnerCache.has(email)) return partnerCache.get(email)!;

  const enrollment = await prisma.programEnrollment.findFirst({
    where: {
      programId: PROGRAM_ID,
      partner: { email },
    },
    select: { partnerId: true },
  });

  const partnerId = enrollment?.partnerId ?? null;
  partnerCache.set(email, partnerId);
  return partnerId;
}

let programPromise: ReturnType<typeof loadProgram> | null = null;

function loadProgram() {
  return prisma.program.findUniqueOrThrow({
    where: { id: PROGRAM_ID },
    select: {
      url: true,
      domain: true,
      defaultFolderId: true,
      workspaceId: true,
    },
  });
}

// Creates a fresh program link owned by `partnerId`. Returns null if creation
// was skipped (e.g. an astronomically unlikely key collision).
export async function createRemediationLink(
  partnerId: string,
  purpose: string,
): Promise<Link | null> {
  programPromise = programPromise ?? loadProgram();
  const program = await programPromise;

  const created = await bulkCreateLinks({
    links: [
      {
        domain: program.domain!,
        key: nanoid(),
        url: program.url!,
        trackConversion: true,
        programId: PROGRAM_ID,
        partnerId,
        folderId: program.defaultFolderId,
        projectId: program.workspaceId,
        comments: purpose,
      },
    ] as ProcessedLinkProps[],
  });

  if (created.length === 0) {
    console.error(`  ❌ failed to create link for partner ${partnerId}`);
    return null;
  }

  const link = await prisma.link.findUnique({ where: { id: created[0].id } });
  console.log(
    `  created link ${link?.id} for partner ${partnerId} (${purpose})`,
  );
  return link;
}

const linkCache = new Map<string, Link | null>();

// Resolve the link a reassigned customer should point to: prefer the partner's
// group-default link, otherwise their oldest link in the program. If the partner
// has no link at all (e.g. a coupon-only affiliate), create one — but only when
// applying. In dry-run, returns null so the caller can report `needs_link`.
export async function getDestinationLink(
  partnerId: string,
): Promise<Link | null> {
  if (linkCache.has(partnerId)) return linkCache.get(partnerId)!;

  let link = await prisma.link.findFirst({
    where: { programId: PROGRAM_ID, partnerId },
    orderBy: [{ partnerGroupDefaultLinkId: "desc" }, { createdAt: "asc" }],
  });

  if (!link && !DRY_RUN) {
    link = await createRemediationLink(
      partnerId,
      "Link created during Rewardful attribution remediation",
    );
  }

  linkCache.set(partnerId, link);
  return link;
}

// ---------------------------------------------------------------------------
// Reassignment
// ---------------------------------------------------------------------------

export type ReassignStatus =
  | "reassigned"
  | "already_correct"
  | "no_customer"
  | "no_partner"
  | "no_destination_link"
  | "needs_link"; // dry-run only: target partner has no link yet (would be created on apply)

export interface ReassignResult {
  status: ReassignStatus;
  stripeCustomerId: string;
  customerId?: string;
  correctAffiliateEmail: string;
  fromPartnerId?: string | null;
  toPartnerId?: string;
  fromLinkId?: string | null;
  toLinkId?: string;
  movedCommissions?: number;
  processedReset?: number;
  paidWithPayoutSkipped?: number;
}

// Tracks links/partners whose denormalized counters need a resync afterwards.
export const touchedLinkIds = new Set<string>();
export const touchedPartnerIds = new Set<string>();
export const payoutIdsToRetally = new Set<string>();
// Commissions that were already PAID via a real Dub payout — moving these is a
// financial (clawback) decision, so we never touch them automatically.
export const paidWithPayoutCommissionIds: string[] = [];

export async function reassignCustomer(
  stripeCustomerId: string,
  correctAffiliateEmail: string,
): Promise<ReassignResult> {
  const base = { stripeCustomerId, correctAffiliateEmail };

  const customer = await prisma.customer.findUnique({
    where: { stripeCustomerId },
    select: { id: true, partnerId: true, linkId: true, programId: true },
  });

  if (!customer || customer.programId !== PROGRAM_ID) {
    return { ...base, status: "no_customer" };
  }

  const toPartnerId = await resolvePartnerId(correctAffiliateEmail);
  if (!toPartnerId) {
    return { ...base, status: "no_partner" };
  }

  if (customer.partnerId === toPartnerId) {
    return { ...base, status: "already_correct", customerId: customer.id };
  }

  const destinationLink = await getDestinationLink(toPartnerId);
  if (!destinationLink) {
    // In dry-run a link-less partner can't be resolved yet; on apply we'd create
    // one. Surface it distinctly so the dry-run summary is accurate.
    return {
      ...base,
      status: DRY_RUN ? "needs_link" : "no_destination_link",
      customerId: customer.id,
    };
  }

  if (customer.linkId) touchedLinkIds.add(customer.linkId);
  touchedLinkIds.add(destinationLink.id);
  if (customer.partnerId) touchedPartnerIds.add(customer.partnerId);
  touchedPartnerIds.add(toPartnerId);

  const result: ReassignResult = {
    ...base,
    status: "reassigned",
    customerId: customer.id,
    fromPartnerId: customer.partnerId,
    toPartnerId,
    fromLinkId: customer.linkId,
    toLinkId: destinationLink.id,
  };

  if (DRY_RUN) {
    const counts = await getCommissionCounts(customer.id);
    return { ...result, ...counts };
  }

  // Move the customer + its commissions atomically so a crash can't leave a
  // customer whose commissions point at a different partner than the customer.
  const commissionResult = await prisma.$transaction(async (tx) => {
    await tx.customer.update({
      where: { id: customer.id },
      data: { partnerId: toPartnerId, linkId: destinationLink.id },
    });

    return reassignCommissions({
      tx,
      customerId: customer.id,
      toPartnerId,
      toLinkId: destinationLink.id,
    });
  });

  return { ...result, ...commissionResult };
}

async function getCommissionCounts(customerId: string) {
  const commissions = await prisma.commission.findMany({
    where: { customerId },
    select: { id: true, status: true, payoutId: true },
  });

  let movedCommissions = 0;
  let processedReset = 0;
  let paidWithPayoutSkipped = 0;

  for (const c of commissions) {
    if (c.payoutId && c.status === "paid") paidWithPayoutSkipped++;
    else if (c.payoutId) processedReset++;
    else movedCommissions++;
  }

  return { movedCommissions, processedReset, paidWithPayoutSkipped };
}

async function reassignCommissions({
  tx,
  customerId,
  toPartnerId,
  toLinkId,
}: {
  tx: Prisma.TransactionClient;
  customerId: string;
  toPartnerId: string;
  toLinkId: string;
}) {
  const commissions = await tx.commission.findMany({
    where: { customerId },
    select: { id: true, status: true, payoutId: true },
  });

  // (a) Commissions NOT tied to a payout: safe to move as-is (preserves the
  //     historical earnings/status, including imported "paid" records).
  const freeIds = commissions.filter((c) => !c.payoutId).map((c) => c.id);

  // (b) Commissions tied to an in-progress payout but not yet disbursed:
  //     detach from the payout, reset to pending, move, then retally the payout.
  const detachIds = commissions
    .filter((c) => c.payoutId && c.status !== "paid")
    .map((c) => c.id);

  // (c) Commissions PAID via a real payout: never auto-move (clawback decision).
  const paidWithPayout = commissions.filter(
    (c) => c.payoutId && c.status === "paid",
  );
  paidWithPayout.forEach((c) => paidWithPayoutCommissionIds.push(c.id));

  commissions
    .filter((c) => c.payoutId && c.status !== "paid")
    .forEach((c) => payoutIdsToRetally.add(c.payoutId!));

  let movedCommissions = 0;
  let processedReset = 0;

  if (freeIds.length > 0) {
    const res = await tx.commission.updateMany({
      where: { id: { in: freeIds } },
      data: { partnerId: toPartnerId, linkId: toLinkId },
    });
    movedCommissions = res.count;
  }

  if (detachIds.length > 0) {
    const res = await tx.commission.updateMany({
      where: { id: { in: detachIds } },
      data: {
        partnerId: toPartnerId,
        linkId: toLinkId,
        payoutId: null,
        status: "pending",
      },
    });
    processedReset = res.count;
  }

  return {
    movedCommissions,
    processedReset,
    paidWithPayoutSkipped: paidWithPayout.length,
  };
}

// ---------------------------------------------------------------------------
// Discount code re-pointing
// ---------------------------------------------------------------------------

// Re-point a DiscountCode whose linkId belongs to a different partner to a
// brand-new link owned by the discount code's partner, so future coupon-based
// attribution (Stripe promo code → DiscountCode → link.partnerId) credits the
// right partner.
export async function fixDiscountCodeLink(discountCodeId: string) {
  const discountCode = await prisma.discountCode.findUnique({
    where: { id: discountCodeId },
    include: { link: { select: { partnerId: true } } },
  });

  if (!discountCode) return { status: "not_found" as const };
  if (discountCode.link?.partnerId === discountCode.partnerId) {
    return { status: "already_correct" as const };
  }

  if (DRY_RUN) {
    return {
      status: "would_fix" as const,
      code: discountCode.code,
      fromLinkId: discountCode.linkId,
    };
  }

  const newLink = await createRemediationLink(
    discountCode.partnerId,
    `Discount code ${discountCode.code} remediation link`,
  );

  if (!newLink) {
    return { status: "link_creation_failed" as const, code: discountCode.code };
  }

  await prisma.discountCode.update({
    where: { id: discountCode.id },
    data: { linkId: newLink.id },
  });

  return {
    status: "fixed" as const,
    code: discountCode.code,
    fromLinkId: discountCode.linkId,
    toLinkId: newLink.id,
  };
}

// ---------------------------------------------------------------------------
// Denormalized counter resync (run once at the end)
// ---------------------------------------------------------------------------

export async function resyncTouchedLinkStats() {
  const linkIds = [...touchedLinkIds];
  if (linkIds.length === 0) return;

  const stats = await prisma.customer.groupBy({
    by: ["linkId"],
    where: { linkId: { in: linkIds } },
    _count: { id: true },
    _sum: { sales: true, saleAmount: true },
  });

  const byLink = new Map(stats.map((s) => [s.linkId, s]));

  for (const linkId of linkIds) {
    const stat = byLink.get(linkId);
    const data = {
      leads: stat?._count.id ?? 0,
      sales: stat?._sum.sales ?? 0,
      saleAmount: BigInt(stat?._sum.saleAmount ?? 0), // BigInt column
    };

    console.log(
      `  link ${linkId} -> leads:${data.leads} sales:${data.sales} saleAmount:${data.saleAmount}`,
    );
    if (!DRY_RUN) {
      await prisma.link.update({ where: { id: linkId }, data });
    }
  }
}

export async function resyncTouchedPartnerStats() {
  for (const partnerId of touchedPartnerIds) {
    const [linkAgg, commissionAgg] = await Promise.all([
      prisma.link.aggregate({
        where: { programId: PROGRAM_ID, partnerId },
        _sum: {
          clicks: true,
          leads: true,
          conversions: true,
          sales: true,
          saleAmount: true,
        },
      }),
      prisma.commission.aggregate({
        where: {
          programId: PROGRAM_ID,
          partnerId,
          earnings: { not: 0 },
          status: { in: ["pending", "processed", "paid"] },
        },
        _sum: { earnings: true },
      }),
    ]);

    const data = {
      totalClicks: linkAgg._sum.clicks ?? 0,
      totalLeads: linkAgg._sum.leads ?? 0,
      totalConversions: linkAgg._sum.conversions ?? 0,
      totalSales: linkAgg._sum.sales ?? 0,
      totalSaleAmount: BigInt(linkAgg._sum.saleAmount ?? 0), // BigInt column
      totalCommissions: commissionAgg._sum.earnings ?? 0,
    };

    console.log(
      `  partner ${partnerId} -> clicks:${data.totalClicks} leads:${data.totalLeads} ` +
        `conversions:${data.totalConversions} sales:${data.totalSales} ` +
        `saleAmount:${data.totalSaleAmount} commissions:${data.totalCommissions}`,
    );
    if (!DRY_RUN) {
      await prisma.programEnrollment.update({
        where: { partnerId_programId: { partnerId, programId: PROGRAM_ID } },
        data,
      });
    }
  }
}

export async function retallyPayouts() {
  for (const payoutId of payoutIdsToRetally) {
    const sum = await prisma.commission.aggregate({
      where: { payoutId },
      _sum: { earnings: true },
    });
    const amount = sum._sum.earnings ?? 0;

    console.log(`  payout ${payoutId} -> amount ${amount}`);
    if (DRY_RUN) continue;

    if (amount > 0) {
      await prisma.payout.update({ where: { id: payoutId }, data: { amount } });
    } else {
      await prisma.payout.delete({ where: { id: payoutId } });
    }
  }
}

export function printResultSummary(results: ReassignResult[]) {
  const byStatus = results.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<ReassignStatus, number>,
  );

  console.log("\n=== Reassignment summary ===");
  console.table(byStatus);

  const reassigned = results.filter((r) => r.status === "reassigned");
  const totalMoved = reassigned.reduce(
    (sum, r) => sum + (r.movedCommissions ?? 0),
    0,
  );
  const totalReset = reassigned.reduce(
    (sum, r) => sum + (r.processedReset ?? 0),
    0,
  );
  const totalPaidSkipped = reassigned.reduce(
    (sum, r) => sum + (r.paidWithPayoutSkipped ?? 0),
    0,
  );

  console.log(`Customers reassigned:        ${reassigned.length}`);
  console.log(`Commissions moved:           ${totalMoved}`);
  console.log(`Commissions detached/reset:  ${totalReset}`);
  console.log(`Paid-w/payout (NOT touched): ${totalPaidSkipped}`);

  const noPartner = results.filter((r) => r.status === "no_partner");
  if (noPartner.length > 0) {
    console.log(
      `\n${noPartner.length} customers could not be reassigned because their Rewardful affiliate is not an enrolled partner:`,
    );
    console.table(
      noPartner.slice(0, 25).map((r) => ({
        stripeCustomerId: r.stripeCustomerId,
        affiliate: r.correctAffiliateEmail,
      })),
    );
  }

  if (paidWithPayoutCommissionIds.length > 0) {
    console.log(
      `\n${paidWithPayoutCommissionIds.length} commissions are PAID via a real payout and were left untouched (clawback decision required).`,
    );
  }
}
