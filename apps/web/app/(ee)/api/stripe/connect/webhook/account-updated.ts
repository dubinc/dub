import { createFraudEvents } from "@/lib/api/fraud/create-fraud-events";
import { qstash } from "@/lib/cron";
import { stripe } from "@/lib/stripe";
import { CreateFraudEventInput } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { FraudRuleType } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK, log } from "@dub/utils";
import Stripe from "stripe";

const queue = qstash.queue({
  queueName: "withdraw-stripe-balance",
});

export async function accountUpdated(event: Stripe.Event) {
  const account = event.data.object as Stripe.Account;

  const { country, payouts_enabled: payoutsEnabled } = account;

  const partner = await prisma.partner.findUnique({
    where: {
      stripeConnectId: account.id,
    },
    select: {
      id: true,
      stripeConnectId: true,
      email: true,
      payoutsEnabledAt: true,
      payoutMethodHash: true,
    },
  });

  if (!partner) {
    return `Partner with stripeConnectId ${account.id} not found, skipping...`;
  }

  if (!payoutsEnabled) {
    if (partner.payoutsEnabledAt || partner.payoutMethodHash) {
      await prisma.partner.update({
        where: {
          id: partner.id,
        },
        data: {
          payoutsEnabledAt: null,
          payoutMethodHash: null,
        },
      });
      return `Payouts disabled, updated partner ${partner.email} (${partner.stripeConnectId}) with payoutsEnabledAt and payoutMethodHash null`;
    }
    return `No change in payout status for ${partner.email} (${partner.stripeConnectId}), skipping...`;
  }

  const { data: externalAccounts } = await stripe.accounts.listExternalAccounts(
    partner.stripeConnectId!,
  );

  const defaultExternalAccount = externalAccounts.find(
    (account) => account.default_for_currency,
  );

  if (!defaultExternalAccount) {
    // this should never happen, but just in case
    await log({
      message: `Expected at least 1 external account for partner ${partner.email} (${partner.stripeConnectId}), none found`,
      type: "errors",
    });
    return `Expected at least 1 external account for partner ${partner.email} (${partner.stripeConnectId}), none found`;
  }

  const { payoutMethodHash } = await prisma.partner.update({
    where: {
      stripeConnectId: account.id,
    },
    data: {
      country,
      payoutsEnabledAt: partner.payoutsEnabledAt
        ? undefined // Don't update if already set
        : new Date(),
      payoutMethodHash: defaultExternalAccount.fingerprint,
    },
  });

  // Check for duplicate payout methods: if multiple partners share the same payout method hash,
  // create fraud events for all their active program enrollments to flag potential fraud
  if (payoutMethodHash) {
    const duplicatePartners = await prisma.partner.findMany({
      where: {
        payoutMethodHash,
      },
      select: {
        id: true,
        programs: {
          where: {
            status: {
              notIn: ["banned", "deactivated", "rejected"],
            },
          },
          select: {
            partnerId: true,
            programId: true,
          },
        },
      },
    });

    if (duplicatePartners.length > 1) {
      const fraudEvents: CreateFraudEventInput[] = [];
      const partnersByProgram = new Map<string, string[]>();

      // Map program → partner list
      for (const partner of duplicatePartners) {
        for (const { programId } of partner.programs) {
          const list = partnersByProgram.get(programId) ?? [];
          list.push(partner.id);
          partnersByProgram.set(programId, list);
        }
      }

      for (const partner of duplicatePartners) {
        for (const { programId } of partner.programs) {
          const enrolledPartners = partnersByProgram.get(programId) ?? [];

          // Always create self event
          fraudEvents.push({
            programId,
            partnerId: partner.id,
            type: FraudRuleType.partnerDuplicatePayoutMethod,
            metadata: {
              payoutMethodHash,
              duplicatePartnerId: partner.id,
            },
          });

          // Create events for other partners in this program
          for (const duplicatePartnerId of enrolledPartners) {
            if (duplicatePartnerId === partner.id) continue;

            fraudEvents.push({
              programId,
              partnerId: partner.id,
              type: FraudRuleType.partnerDuplicatePayoutMethod,
              metadata: {
                payoutMethodHash,
                duplicatePartnerId,
              },
            });
          }
        }
      }

      await createFraudEvents(fraudEvents);
    }
  }

  // Retry payouts that got stuck when the account was restricted (e.g: payout sent but paused
  // due to verification requirements). Once payouts are re-enabled, queue them for processing.
  const pendingPayouts = await prisma.payout.count({
    where: {
      partnerId: partner.id,
      status: "sent",
      mode: "internal",
    },
  });

  if (pendingPayouts > 0) {
    await queue.enqueueJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/balance-available`,
      deduplicationId: event.id,
      method: "POST",
      body: {
        stripeAccount: partner.stripeConnectId,
      },
    });
  }

  return `Updated partner ${partner.email} (${partner.stripeConnectId}) with country ${country}, payoutsEnabledAt set, payoutMethodHash ${defaultExternalAccount.fingerprint}`;
}
