import { queuePartnerSearchSync } from "@/lib/api/partners/queue-partner-search-sync";
import { qstash } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import { partnerProfileChangeHistoryLogSchema } from "@/lib/zod/schemas/partner-profile";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";

export async function updatePartnerCountry({
  partnerId,
  country,
  isAdmin,
}: {
  partnerId: string;
  country: string;
  isAdmin?: boolean;
}) {
  const partner = await prisma.partner.findUnique({
    where: {
      id: partnerId,
    },
    select: {
      id: true,
      country: true,
      changeHistoryLog: true,
      identityVerifiedAt: true,
    },
  });

  if (!partner) {
    throw new Error("Partner not found.");
  }

  if (partner.country === country) {
    return;
  }

  if (!isAdmin && partner.country !== "US") {
    throw new Error(
      "Your profile country cannot be changed. Contact support to update it.",
    );
  }

  const processingPayout = await prisma.payout.findFirst({
    where: {
      partnerId: partner.id,
      status: "processing",
    },
    select: {
      id: true,
    },
  });

  if (processingPayout) {
    throw new Error(
      "Your country cannot be changed while a payout is being processed.",
    );
  }

  const partnerChangeHistoryLog = partner.changeHistoryLog
    ? partnerProfileChangeHistoryLogSchema.parse(partner.changeHistoryLog)
    : [];

  partnerChangeHistoryLog.push({
    field: "country",
    from: partner.country,
    to: country,
    changedAt: new Date(),
  });

  const updated = await prisma.partner.updateMany({
    where: {
      id: partner.id,
      ...(!isAdmin && { country: "US" }),
    },
    data: {
      country,
      changeHistoryLog: partnerChangeHistoryLog,
      // reset all payout fields
      defaultPayoutMethod: null,
      payoutsEnabledAt: null,
      paypalEmail: null,
      stripeConnectId: null,
      stripeRecipientId: null,
      payoutMethodHash: null,
      cryptoWalletAddress: null,
    },
  });

  if (updated.count === 0) {
    throw new Error(
      !isAdmin
        ? "Your profile country cannot be changed. Contact support to update it."
        : "Partner not found.",
    );
  }

  // Queue an index update because the partner country moved (filterable field)
  waitUntil(queuePartnerSearchSync({ partnerIds: [partner.id] }));

  // if there was an existing veriff session, trigger a country change verification
  if (partner.identityVerifiedAt) {
    waitUntil(
      qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/partners/verify-country-change`,
        body: {
          partnerId: partner.id,
        },
      }),
    );
  }
}
