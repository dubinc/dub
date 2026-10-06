import { queuePartnerSearchSync } from "@/lib/api/partners/queue-partner-search-sync";
import { qstash } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import { partnerProfileChangeHistoryLogSchema } from "@/lib/zod/schemas/partner-profile";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";

export async function updatePartnerCountry({
  partnerId,
  country,
}: {
  partnerId: string;
  country: string;
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

  const partnerChangeHistoryLog = partner.changeHistoryLog
    ? partnerProfileChangeHistoryLogSchema.parse(partner.changeHistoryLog)
    : [];

  partnerChangeHistoryLog.push({
    field: "country",
    from: partner.country,
    to: country,
    changedAt: new Date(),
  });

  await prisma.partner.update({
    where: {
      id: partner.id,
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
