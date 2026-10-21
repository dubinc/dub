import "dotenv-flow/config";

import { trackCommissionStatusUpdate } from "@/lib/api/commissions/track-commission-update-activity-log";
import { createFraudEvents } from "@/lib/api/fraud/create-fraud-events";
import { getMergedFraudRules } from "@/lib/api/fraud/get-merged-fraud-rules";
import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { isGenericEmail } from "@/lib/email/is-generic-email";
import { retallyPayoutsAmount } from "@/lib/payouts/retally-payouts-amount";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { prisma } from "@/lib/prisma";
import { CustomerEmailMatchType } from "@/lib/zod/schemas/fraud";
import { INACTIVE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { chunk, groupBy } from "@dub/utils";
import {
  CommissionStatus,
  FraudEventStatus,
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
// The fraud event is created before the hold, so a held commission always
// has a group that can release it. A second run picks up a customer whose
// event exists but whose commissions were not held yet.
//
// Usage: pnpm script migrations/hold-similar-email-commissions <customer-ids.json>

const DRY_RUN = true;
const FREE_EMAIL_ONLY = true; // Company domains are mostly the program team's own +tag tests
const BATCH_SIZE = 50;

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

const normalizeRawEmail = (email: string) => email.toLowerCase().trim();

async function main() {
  const inputPath = process.argv[2];

  if (!inputPath) {
    throw new Error("Pass the path to a JSON array of customer IDs.");
  }

  const input: unknown = JSON.parse(readFileSync(inputPath, "utf8"));

  if (
    !Array.isArray(input) ||
    !input.every((id) => typeof id === "string" && id.startsWith("cus_"))
  ) {
    throw new Error("The input must be a JSON array of customer IDs.");
  }

  const customerIds = [...new Set(input as string[])];

  console.log(
    `DRY_RUN=${DRY_RUN} FREE_EMAIL_ONLY=${FREE_EMAIL_ONLY} customers=${customerIds.length}`,
  );

  const skipped: Record<string, number> = {};
  const skip = (reason: string, count = 1) => {
    skipped[reason] = (skipped[reason] ?? 0) + count;
  };

  const summary: {
    customerId: string;
    email: string;
    matchedEmail: string;
    programId: string;
    partnerId: string;
    commissions: number;
    inPendingPayout: number;
    earnings: number;
    held: number | null;
  }[] = [];

  const failed: { customerId: string; error: string }[] = [];

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
            workspaceId: true,
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

    skip("not found", batch.length - customers.length);

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

      if (
        !getPlanCapabilities(customer.program.workspace.plan)
          .canManageFraudEvents
      ) {
        skip("plan cannot manage fraud events");
        return false;
      }

      // Same enrollment checks as detectAndRecordFraudEvent
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
      orderBy: [
        {
          createdAt: "asc",
        },
        {
          id: "asc",
        },
      ],
    });

    const membersByGroup = groupBy(
      groupMembers,
      (m) => `${m.programId}:${m.normalizedEmail}`,
    );

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
        metadata: true,
        fraudEventGroup: {
          select: {
            status: true,
          },
        },
      },
    });

    const eventsByCustomer = groupBy(existingEvents, (e) => e.customerId!);

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
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const commissionsByCustomer = groupBy(commissions, (c) => c.customerId!);

    for (const customer of candidates) {
      const email = customer.email!;
      const programId = customer.programId!;
      const partnerId = customer.partnerId!;

      // Members are sorted by createdAt, so this is the earliest match
      const matchedCustomer = (
        membersByGroup[`${programId}:${customer.normalizedEmail}`] ?? []
      ).find(
        (m) =>
          m.email &&
          m.createdAt < customer.createdAt &&
          normalizeRawEmail(m.email) !== normalizeRawEmail(email),
      );

      if (!matchedCustomer) {
        skip("no earlier variant");
        continue;
      }

      // A resolved or expired event means the program already reviewed this
      // customer or let the hold lapse. A pending event of another match
      // type is the live rule's decision. A pending similar email event can
      // only come from this script or the live rule, so the hold continues.
      const events = eventsByCustomer[customer.id] ?? [];

      if (
        events.some(
          (e) => e.fraudEventGroup.status !== FraudEventStatus.pending,
        )
      ) {
        skip("customerEmailMatch event already resolved or expired");
        continue;
      }

      if (
        events.some(
          (e) =>
            (e.metadata as { matchType?: string } | null)?.matchType !==
            CustomerEmailMatchType.SIMILAR_EMAIL_MATCH,
        )
      ) {
        skip("pending customerEmailMatch event of another match type");
        continue;
      }

      // Hold only the commissions of the partner in the fraud event
      const customerCommissions = (
        commissionsByCustomer[customer.id] ?? []
      ).filter((c) => c.programId === programId && c.partnerId === partnerId);

      if (customerCommissions.length === 0) {
        skip("no unpaid commissions");
        continue;
      }

      const firstCommission = customerCommissions[0];

      const row: (typeof summary)[number] = {
        customerId: customer.id,
        email,
        matchedEmail: matchedCustomer.email!,
        programId,
        partnerId,
        commissions: customerCommissions.length,
        inPendingPayout: customerCommissions.filter((c) => c.payoutId).length,
        earnings: customerCommissions.reduce((sum, c) => sum + c.earnings, 0),
        held: null,
      };

      summary.push(row);

      if (DRY_RUN) {
        continue;
      }

      try {
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
        // holdProcessedCommissions. The guards skip rows that changed after
        // they were read.
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

        row.held = held.length;

        // Payout amounts must match their commissions again, and a payout
        // with no commissions left is deleted. A second run skips these held
        // commissions, so a failed payout must be fixed by hand.
        const failedPayoutIds = await retallyPayoutsAmount([
          ...new Set(held.flatMap((c) => (c.payoutId ? [c.payoutId] : []))),
        ]);

        if (failedPayoutIds.length > 0) {
          failed.push({
            customerId: customer.id,
            error: `Failed to retally payouts: ${failedPayoutIds.join(", ")}`,
          });
        }

        await trackCommissionStatusUpdate({
          workspaceId: customer.program!.workspaceId,
          programId,
          commissions: held,
          newStatus: CommissionStatus.hold,
        });

        await syncTotalCommissions({
          programId,
          partnerId,
        });

        console.log(
          `Held ${held.length} of ${customerCommissions.length} commissions for customer ${customer.id}`,
        );
      } catch (error) {
        console.error(`Failed for customer ${customer.id}:`, error);

        failed.push({
          customerId: customer.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  console.table(
    summary.map((s) => ({
      ...s,
      earnings: `$${(s.earnings / 100).toFixed(2)}`,
    })),
  );
  console.table(skipped);

  if (failed.length > 0) {
    console.table(failed);
  }

  console.log(
    `DRY_RUN=${DRY_RUN} ${DRY_RUN ? "would hold" : "held"} customers=${summary.length} commissions=${summary.reduce((sum, s) => sum + (DRY_RUN ? s.commissions : s.held ?? 0), 0)} inPendingPayout=${summary.reduce((sum, s) => sum + s.inPendingPayout, 0)} earnings=$${(summary.reduce((sum, s) => sum + s.earnings, 0) / 100).toFixed(2)} failed=${failed.length}`,
  );
}

main();
