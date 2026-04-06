import { withCron } from "@/lib/cron/with-cron";
import { fetchVeriffSessionDecision } from "@/lib/veriff/fetch-veriff-session-decision";
import {
  mergeVeriffMetadata,
  parseVeriffMetadata,
} from "@/lib/veriff/veriff-metadata";
import { sendEmail } from "@dub/email";
import PartnerIdentityVerificationFailed from "@dub/email/templates/partner-identity-verification-failed";
import { prisma } from "@dub/prisma";
import { logAndRespond } from "app/(ee)/api/cron/utils";
import * as z from "zod/v4";

export const dynamic = "force-dynamic";

const schema = z.object({
  partnerId: z.string(),
});

// POST /api/cron/partners/verify-country-change
export const POST = withCron(async ({ rawBody }) => {
  const { partnerId } = schema.parse(JSON.parse(rawBody));

  const partner = await prisma.partner.findUnique({
    where: {
      id: partnerId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      country: true,
      identityVerificationStatus: true,
      identityVerifiedAt: true,
      veriffSessionId: true,
      veriffMetadata: true,
    },
  });

  if (!partner) {
    return logAndRespond("Partner not found.");
  }

  if (!partner.veriffSessionId) {
    return logAndRespond("No Veriff session ID found. Skipping.");
  }

  if (!partner.country) {
    return logAndRespond("Partner has no country set. Skipping.");
  }

  // Fetch the original Veriff decision to get the document country
  let documentCountry: string | null = null;

  try {
    const { verification } = await fetchVeriffSessionDecision(
      partner.veriffSessionId,
    );

    documentCountry =
      (verification.document?.country || verification.person?.nationality) ??
      null;
  } catch (error) {
    console.error(
      `Failed to fetch Veriff decision for partner ${partnerId}:`,
      error,
    );

    // Don't revoke on uncertainty — QStash will retry
    throw error;
  }

  if (!documentCountry) {
    return logAndRespond(
      "Could not determine document country from Veriff decision. Skipping.",
    );
  }

  // Compare partner's current country with the verified document country
  if (partner.country.toLowerCase() === documentCountry.toLowerCase()) {
    return logAndRespond("Country matches. No action needed.");
  }

  // Mismatch — reset identity verification, but preserve attemptCount
  const declineReason =
    "Your account country no longer matches your verified identity document country. Please re-verify.";

  const { attemptCount } = parseVeriffMetadata(partner.veriffMetadata);

  await prisma.partner.update({
    where: {
      id: partner.id,
    },
    data: {
      identityVerificationStatus: null,
      identityVerifiedAt: null,
      veriffSessionId: null,
      veriffMetadata: mergeVeriffMetadata(partner.veriffMetadata, {
        sessionUrl: null,
        sessionExpiresAt: null,
        declineReason,
        attemptCount,
      }),
    },
  });

  if (partner.email) {
    await sendEmail({
      to: partner.email,
      subject: "Identity re-verification required",
      headers: {
        "Idempotency-Key": `country-change-${partner.id}`,
      },
      react: PartnerIdentityVerificationFailed({
        failureType: "countryChange",
        failureReasonText: declineReason,
        partner: {
          name: partner.name,
          email: partner.email,
        },
      }),
    });
  }

  return logAndRespond(
    `Country mismatch detected for partner ${partnerId}. Verification reset and email sent.`,
  );
});
