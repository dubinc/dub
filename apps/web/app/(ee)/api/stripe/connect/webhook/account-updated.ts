import { detectDuplicatePayoutMethodFraud } from "@/lib/api/fraud/detect-duplicate-payout-method-fraud";
import { qstash } from "@/lib/cron";
import { getPartnerBankAccount } from "@/lib/partners/get-partner-bank-account";
import { recomputePartnerPayoutState } from "@/lib/payouts/recompute-partner-payout-state";
import { partnerProfileChangeHistoryLogSchema } from "@/lib/zod/schemas/partner-profile";
import { sendEmail } from "@dub/email";
import ConnectedPayoutMethod from "@dub/email/templates/connected-payout-method";
import DuplicatePayoutMethod from "@dub/email/templates/duplicate-payout-method";
import { prisma } from "@dub/prisma";
import { PartnerProfileType } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import Stripe from "stripe";

const stripePayoutQueue = qstash.queue({
  queueName: "send-stripe-payout",
});

const balanceAvailableQueue = qstash.queue({
  queueName: "handle-balance-available",
});

export async function accountUpdated(event: Stripe.AccountUpdatedEvent) {
  const account = event.data.object;
  const { country, business_type } = account;

  const partner = await prisma.partner.findUnique({
    where: {
      stripeConnectId: account.id,
    },
    select: {
      id: true,
      email: true,
      country: true,
      profileType: true,
      changeHistoryLog: true,
      stripeConnectId: true,
      stripeRecipientId: true,
      paypalEmail: true,
      payoutsEnabledAt: true,
      defaultPayoutMethod: true,
      payoutMethodHash: true,
    },
  });

  if (!partner) {
    return `Partner with stripeConnectId ${account.id} not found, skipping...`;
  }

  const { payoutsEnabledAt, defaultPayoutMethod } =
    await recomputePartnerPayoutState(partner);

  const payoutStateChanged =
    partner.payoutsEnabledAt !== payoutsEnabledAt ||
    partner.defaultPayoutMethod !== defaultPayoutMethod;

  const nextProfileType: PartnerProfileType | undefined =
    business_type === "individual"
      ? "individual"
      : business_type
        ? "company"
        : undefined;

  const countryChanged =
    Boolean(country) &&
    partner.country?.toLowerCase() !== country!.toLowerCase();

  const profileTypeChanged =
    nextProfileType !== undefined &&
    partner.profileType.toLowerCase() !== nextProfileType.toLowerCase();

  const partnerChangeHistoryLog = partner.changeHistoryLog
    ? partnerProfileChangeHistoryLogSchema.parse(partner.changeHistoryLog)
    : [];

  if (countryChanged) {
    partnerChangeHistoryLog.push({
      field: "country",
      from: partner.country ?? null,
      to: country!,
      changedAt: new Date(),
    });
  }

  if (profileTypeChanged) {
    partnerChangeHistoryLog.push({
      field: "profileType",
      from: partner.profileType,
      to: nextProfileType!,
      changedAt: new Date(),
    });
  }

  // Always sync country and profileType; sync payout state only if changed
  await prisma.partner.update({
    where: {
      id: partner.id,
    },
    data: {
      ...(country && { country }),
      ...(business_type && {
        profileType: business_type === "individual" ? "individual" : "company",
      }),
      ...(partnerChangeHistoryLog.length > 0 && {
        changeHistoryLog: partnerChangeHistoryLog,
      }),
      ...(payoutStateChanged && {
        payoutsEnabledAt,
        defaultPayoutMethod,
      }),
    },
  });

  if (!payoutStateChanged) {
    return `No change in payout state for partner ${partner.email} (${partner.stripeConnectId}), skipping...`;
  }

  if (partner.payoutsEnabledAt && !payoutsEnabledAt) {
    return `Payouts disabled, updated partner ${partner.email} (${partner.stripeConnectId}) with payoutsEnabledAt null`;
  }

  const bankAccount = await getPartnerBankAccount(partner.stripeConnectId!);

  if (!bankAccount) {
    // TODO: account for cases where partner connects a debit card instead
    return `No bank account found for partner ${partner.email} (${partner.stripeConnectId}), skipping...`;
  }

  const { payoutMethodHash } = await prisma.partner.update({
    where: {
      stripeConnectId: account.id,
    },
    data: {
      payoutsEnabledAt: partner.payoutsEnabledAt
        ? undefined // Don't update if already set
        : new Date(),
      payoutMethodHash: bankAccount.fingerprint,
    },
  });

  if (payoutMethodHash) {
    const [duplicatePartnersCount, _] = await Promise.all([
      prisma.partner.count({
        where: {
          payoutMethodHash,
          id: {
            not: partner.id,
          },
        },
      }),

      detectDuplicatePayoutMethodFraud({
        payoutMethodHash,
      }),
    ]);

    // Send confirmation email only if this is the first time connecting a bank account
    if (
      duplicatePartnersCount === 0 &&
      partner.email &&
      !partner.payoutsEnabledAt
    ) {
      await sendEmail({
        variant: "notifications",
        subject: "Successfully connected payout method",
        to: partner.email,
        react: ConnectedPayoutMethod({
          email: partner.email,
          payoutMethod: bankAccount,
        }),
      });
    }

    // Notify the partner about duplicate payout method
    if (duplicatePartnersCount > 0 && partner.email) {
      await sendEmail({
        variant: "notifications",
        subject: "Duplicate payout method detected",
        to: partner.email,
        react: DuplicatePayoutMethod({
          email: partner.email,
          payoutMethod: bankAccount,
        }),
      });
    }
  }

  // Retry payouts that got stuck when the account was restricted
  // (e.g: previously processed payouts OR payouts that were sent but paused due to verification requirements).
  // Once payouts are re-enabled, queue them for processing.
  const [previouslyProcessedPayouts, payoutsToWithdraw] = await Promise.all([
    prisma.payout.count({
      where: {
        partnerId: partner.id,
        status: "processed",
        stripeTransferId: null,
      },
    }),
    prisma.payout.count({
      where: {
        partnerId: partner.id,
        status: "sent",
        mode: "internal",
      },
    }),
  ]);
  console.log({ previouslyProcessedPayouts, payoutsToWithdraw });

  await Promise.allSettled([
    ...(previouslyProcessedPayouts > 0
      ? [
          stripePayoutQueue
            .enqueueJSON({
              url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/send-stripe-payout`,
              method: "POST",
              deduplicationId: `${event.id}-send-stripe-payout`,
              body: {
                partnerId: partner.id,
              },
            })
            .then((res) => {
              console.log(
                `Enqueued send-stripe-payout queue for partner ${partner.id}: ${res.messageId}`,
              );
            }),
        ]
      : []),
    ...(payoutsToWithdraw > 0
      ? [
          balanceAvailableQueue
            .enqueueJSON({
              url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/balance-available`,
              deduplicationId: `${event.id}-balance-available`,
              method: "POST",
              body: {
                stripeAccount: partner.stripeConnectId,
              },
            })
            .then((res) => {
              console.log(
                `Enqueued balance-available queue for partner ${partner.stripeConnectId}: ${res.messageId}`,
              );
            }),
        ]
      : []),
  ]);

  return `Updated partner ${partner.email} (${partner.stripeConnectId}) with country ${country}, payoutsEnabledAt set, payoutMethodHash ${bankAccount.fingerprint}`;
}
