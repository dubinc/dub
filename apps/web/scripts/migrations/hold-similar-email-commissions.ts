import "dotenv-flow/config";

import { trackCommissionStatusUpdate } from "@/lib/api/commissions/track-commission-update-activity-log";
import { createFraudEvents } from "@/lib/api/fraud/create-fraud-events";
import { getMergedFraudRules } from "@/lib/api/fraud/get-merged-fraud-rules";
import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { isGenericEmail } from "@/lib/email/is-generic-email";
import { retallyPayoutsAmount } from "@/lib/payouts/retally-payouts-amount";
import { prisma } from "@/lib/prisma";
import { CustomerEmailMatchType } from "@/lib/zod/schemas/fraud";
import { INACTIVE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { chunk, groupBy } from "@dub/utils";
import {
  CommissionStatus,
  FraudRuleType,
  PayoutStatus,
  Prisma,
} from "@prisma/client";
import { readFileSync } from "fs";

// TODO: Remove this script once the old similar-email cases are held in
// production.

// Holds the unpaid commissions of customers whose email is a variant of an
// earlier customer in the same program, and records a customerEmailMatch
// fraud event for each one so the program can review it. The input is a JSON
// array of customer IDs from the read-only variant email report. Every
// customer is checked again here before anything is written.
//
// Usage: pnpm script migrations/hold-similar-email-commissions <customer-ids.json>

const DRY_RUN = true;
const FREE_EMAIL_ONLY = true; // Company domains are mostly the program team's own +tag tests
const BATCH_SIZE = 50;

const HOLD_ELIGIBLE_PLANS = ["advanced", "enterprise"];

// Unpaid commissions that a hold can still stop. Commissions in a payout that
// is already processing are left alone.
const holdEligibleWhere: Prisma.CommissionWhereInput = {
  earnings: {
    gt: 0,
  },
  OR: [
    {
      status: CommissionStatus.pending,
    },
    {
      status: CommissionStatus.processed,
      payout: {
        status: PayoutStatus.pending,
      },
    },
  ],
};

async function main() {
  const inputPath = process.argv[2];

  if (!inputPath) {
    throw new Error("Pass the path to a JSON array of customer IDs.");
  }

  const customerIds: string[] = JSON.parse(readFileSync(inputPath, "utf8"));

  console.log(
    `DRY_RUN=${DRY_RUN} FREE_EMAIL_ONLY=${FREE_EMAIL_ONLY} customers=${customerIds.length}`,
  );

  const skipped: Record<string, number> = {};
  const skip = (reason: string) => {
    skipped[reason] = (skipped[reason] ?? 0) + 1;
  };

  const summary: {
    customerId: string;
    email: string;
    matchedEmail: string;
    programId: string;
    partnerId: string;
    commissions: number;
    earnings: number;
  }[] = [];

  const payoutIdsToRetally = new Set<string>();
  const pairsToSync = new Map<
    string,
    { programId: string; partnerId: string }
  >();

  for (const batch of chunk(customerIds, BATCH_SIZE)) {
    const customers = await prisma.customer.findMany({
      where: {
        id: {
          in: batch,
        },
      },
      select: {
        id: true,
        email: true,
        normalizedEmail: true,
        projectId: true,
        programId: true,
        partnerId: true,
        linkId: true,
        createdAt: true,
        program: {
          select: {
            workspace: {
              select: {
                plan: true,
              },
            },
            fraudRules: true,
          },
        },
        programEnrollment: {
          select: {
            status: true,
            riskMonitoringDisabledAt: true,
          },
        },
      },
    });

    skipped["not found"] =
      (skipped["not found"] ?? 0) + batch.length - customers.length;

    const candidates = customers.filter((customer) => {
      if (
        !customer.email ||
        !customer.normalizedEmail ||
        !customer.programId ||
        !customer.partnerId ||
        !customer.program ||
        !customer.programEnrollment
      ) {
        skip("missing email, program or partner");
        return false;
      }

      if (FREE_EMAIL_ONLY && !isGenericEmail(customer.email)) {
        skip("company email domain");
        return false;
      }

      if (!HOLD_ELIGIBLE_PLANS.includes(customer.program.workspace.plan)) {
        skip("plan cannot manage fraud events");
        return false;
      }

      if (
        INACTIVE_ENROLLMENT_STATUSES.includes(customer.programEnrollment.status)
      ) {
        skip("enrollment inactive");
        return false;
      }

      if (customer.programEnrollment.riskMonitoringDisabledAt) {
        skip("risk monitoring disabled");
        return false;
      }

      const emailMatchRule = getMergedFraudRules(
        customer.program.fraudRules,
      ).find((rule) => rule.type === FraudRuleType.customerEmailMatch);

      if (!emailMatchRule?.enabled) {
        skip("customerEmailMatch rule disabled");
        return false;
      }

      return true;
    });

    if (candidates.length === 0) {
      continue;
    }

    // Same check as the similar email match in checkCustomerEmailMatch: an
    // earlier customer in the same program with the same normalized email
    // but a different raw email
    const groupMembers = await prisma.customer.findMany({
      where: {
        OR: candidates.map((c) => ({
          projectId: c.projectId,
          normalizedEmail: c.normalizedEmail,
          programId: c.programId,
        })),
      },
      select: {
        id: true,
        email: true,
        normalizedEmail: true,
        programId: true,
        createdAt: true,
      },
    });

    const membersByGroup = groupBy(
      groupMembers,
      (m) => `${m.programId}:${m.normalizedEmail}`,
    );

    // A customer that already has a customerEmailMatch event was flagged
    // before, maybe reviewed too, so it is not flagged again
    const existingEvents = await prisma.fraudEvent.findMany({
      where: {
        customerId: {
          in: candidates.map((c) => c.id),
        },
        fraudEventGroup: {
          type: FraudRuleType.customerEmailMatch,
        },
      },
      select: {
        customerId: true,
      },
    });

    const flaggedCustomerIds = new Set(existingEvents.map((e) => e.customerId));

    const commissions = await prisma.commission.findMany({
      where: {
        customerId: {
          in: candidates.map((c) => c.id),
        },
        ...holdEligibleWhere,
      },
      select: {
        id: true,
        amount: true,
        earnings: true,
        status: true,
        customerId: true,
        programId: true,
        partnerId: true,
        linkId: true,
        eventId: true,
        payoutId: true,
        createdAt: true,
        program: {
          select: {
            workspaceId: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const commissionsByCustomer = groupBy(commissions, (c) => c.customerId!);

    for (const customer of candidates) {
      const matchedCustomer = (
        membersByGroup[`${customer.programId}:${customer.normalizedEmail}`] ??
        []
      ).find(
        (m) =>
          m.createdAt < customer.createdAt &&
          m.email?.toLowerCase().trim() !==
            customer.email!.toLowerCase().trim(),
      );

      if (!matchedCustomer) {
        skip("no earlier variant");
        continue;
      }

      if (flaggedCustomerIds.has(customer.id)) {
        skip("already has a customerEmailMatch event");
        continue;
      }

      // A customer can only have commissions from its own partner, but the
      // filter keeps the hold scoped to the fraud event's partner
      const customerCommissions = (
        commissionsByCustomer[customer.id] ?? []
      ).filter(
        (c) =>
          c.programId === customer.programId &&
          c.partnerId === customer.partnerId,
      );

      if (customerCommissions.length === 0) {
        skip("no unpaid commissions");
        continue;
      }

      const programId = customer.programId!;
      const partnerId = customer.partnerId!;
      const firstCommission = customerCommissions[0];

      summary.push({
        customerId: customer.id,
        email: customer.email!,
        matchedEmail: matchedCustomer.email!,
        programId,
        partnerId,
        commissions: customerCommissions.length,
        earnings: customerCommissions.reduce((sum, c) => sum + c.earnings, 0),
      });

      if (DRY_RUN) {
        continue;
      }

      await createFraudEvents([
        {
          programId,
          partnerId,
          type: FraudRuleType.customerEmailMatch,
          customerId: customer.id,
          linkId: firstCommission.linkId ?? customer.linkId,
          eventId: firstCommission.eventId,
          metadata: {
            matchType: CustomerEmailMatchType.SIMILAR_EMAIL_MATCH,
            matchedCustomerId: matchedCustomer.id,
          },
        },
      ]);

      // Processed commissions leave their pending payout, like in
      // holdProcessedCommissions. The status guards skip rows that changed
      // after they were read.
      await prisma.commission.updateMany({
        where: {
          id: {
            in: customerCommissions.map((c) => c.id),
          },
          ...holdEligibleWhere,
        },
        data: {
          status: CommissionStatus.hold,
          payoutId: null,
        },
      });

      const heldCommissions = await prisma.commission.findMany({
        where: {
          id: {
            in: customerCommissions.map((c) => c.id),
          },
          status: CommissionStatus.hold,
        },
        select: {
          id: true,
        },
      });

      const heldIds = new Set(heldCommissions.map(({ id }) => id));
      const held = customerCommissions.filter((c) => heldIds.has(c.id));

      for (const { payoutId } of held) {
        if (payoutId) payoutIdsToRetally.add(payoutId);
      }

      await trackCommissionStatusUpdate({
        workspaceId: firstCommission.program.workspaceId,
        programId,
        commissions: held,
        newStatus: CommissionStatus.hold,
      });

      pairsToSync.set(`${programId}:${partnerId}`, { programId, partnerId });

      console.log(
        `Held ${held.length} of ${customerCommissions.length} commissions for customer ${customer.id}`,
      );
    }
  }

  if (!DRY_RUN) {
    // Payout amounts must match their commissions again, and a payout with
    // no commissions left is deleted
    await retallyPayoutsAmount(Array.from(payoutIdsToRetally));

    await Promise.allSettled(
      Array.from(pairsToSync.values()).map((pair) =>
        syncTotalCommissions(pair),
      ),
    );
  }

  console.table(
    summary.map((s) => ({
      ...s,
      earnings: `$${(s.earnings / 100).toFixed(2)}`,
    })),
  );
  console.table(skipped);
  console.log(
    `DRY_RUN=${DRY_RUN} ${DRY_RUN ? "would hold" : "held"} customers=${summary.length} commissions=${summary.reduce((sum, s) => sum + s.commissions, 0)} earnings=$${(summary.reduce((sum, s) => sum + s.earnings, 0) / 100).toFixed(2)} payoutsRetallied=${payoutIdsToRetally.size}`,
  );
}

main();
