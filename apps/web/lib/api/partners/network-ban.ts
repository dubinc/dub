import { recomputePartnerPayoutState } from "@/lib/payouts/recompute-partner-payout-state";
import { prisma } from "@/lib/prisma";
import { partnerProfileChangeHistoryLogSchema } from "@/lib/zod/schemas/partner-profile";

/**
 * Bans a partner from the Dub Partner Network. The partner can't apply to
 * programs and payoutsEnabledAt stays null until an admin unbans them.
 * Existing program enrollments are not changed.
 */
export async function banPartnerFromNetwork(partnerId: string) {
  const partner = await prisma.partner.findUniqueOrThrow({
    where: {
      id: partnerId,
    },
    select: {
      networkStatus: true,
      changeHistoryLog: true,
    },
  });

  if (partner.networkStatus === "banned") {
    return;
  }

  const partnerChangeHistoryLog = partner.changeHistoryLog
    ? partnerProfileChangeHistoryLogSchema.parse(partner.changeHistoryLog)
    : [];

  partnerChangeHistoryLog.push({
    field: "networkStatus",
    from: partner.networkStatus,
    to: "banned",
    changedAt: new Date(),
  });

  await prisma.partner.update({
    where: {
      id: partnerId,
    },
    data: {
      networkStatus: "banned",
      trustedAt: null,
      payoutsEnabledAt: null,
      changeHistoryLog: partnerChangeHistoryLog,
    },
  });
}

/**
 * Moves a banned partner back to draft, so they must submit their network
 * profile again. Payouts are enabled again if a payout method is still active.
 */
export async function unbanPartnerFromNetwork(partnerId: string) {
  const partner = await prisma.partner.findUniqueOrThrow({
    where: {
      id: partnerId,
    },
    select: {
      networkStatus: true,
      changeHistoryLog: true,
      stripeConnectId: true,
      stripeRecipientId: true,
      paypalEmail: true,
      payoutsEnabledAt: true,
      defaultPayoutMethod: true,
      cryptoWalletAddress: true,
      tremendousEmail: true,
    },
  });

  if (partner.networkStatus !== "banned") {
    throw new Error("Partner is not banned from the network.");
  }

  const { payoutsEnabledAt, defaultPayoutMethod } =
    await recomputePartnerPayoutState({
      ...partner,
      networkStatus: "draft",
    });

  const partnerChangeHistoryLog = partner.changeHistoryLog
    ? partnerProfileChangeHistoryLogSchema.parse(partner.changeHistoryLog)
    : [];

  partnerChangeHistoryLog.push({
    field: "networkStatus",
    from: "banned",
    to: "draft",
    changedAt: new Date(),
  });

  await prisma.partner.update({
    where: {
      id: partnerId,
      networkStatus: "banned",
    },
    data: {
      networkStatus: "draft",
      reviewedAt: null,
      payoutsEnabledAt,
      defaultPayoutMethod,
      changeHistoryLog: partnerChangeHistoryLog,
    },
  });
}
