import { veriffDecisionEventSchema } from "@/lib/veriff/schema";
import {
  mergeVeriffMetadata,
  parseVeriffMetadata,
} from "@/lib/veriff/veriff-metadata";
import { sendEmail } from "@dub/email";
import PartnerIdentityVerificationFailed from "@dub/email/templates/partner-identity-verification-failed";
import PartnerIdentityVerified from "@dub/email/templates/partner-identity-verified";
import { prisma } from "@dub/prisma";
import { IdentityVerificationStatus, Partner } from "@dub/prisma/client";
import { logAndRespond } from "app/(ee)/api/cron/utils";
import * as z from "zod/v4";

type VeriffDecisionEvent = z.infer<typeof veriffDecisionEventSchema>;

const veriffStatusMap: Record<
  VeriffDecisionEvent["verification"]["status"],
  IdentityVerificationStatus
> = {
  approved: "approved",
  declined: "declined",
  expired: "expired",
  abandoned: "abandoned",
  review: "review",
  resubmission_requested: "resubmissionRequested",
};

export const handleDecisionEvent = async ({
  verification,
}: VeriffDecisionEvent) => {
  const { id, status, decisionTime, reason, attemptId } = verification;

  let effectiveStatus = status;

  const partner = await prisma.partner.findUnique({
    where: {
      veriffSessionId: id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      country: true,
      identityVerifiedAt: true,
      veriffMetadata: true,
    },
  });

  if (!partner) {
    return logAndRespond("[Veriff Webhook] No partner found for session.");
  }

  if (partner.identityVerifiedAt) {
    return logAndRespond("[Veriff Webhook] Partner already verified.");
  }

  // since we're skipping verified partners, by default identityVerifiedAt is null
  let identityVerifiedAt: Date | null = null;

  let { sessionUrl, attemptCount, declineReason, sessionExpiresAt } =
    parseVeriffMetadata(partner.veriffMetadata);

  // set decline reason to the reason from the webhook
  declineReason = reason;

  // If the verification was approved, check for country mismatch
  if (effectiveStatus === "approved") {
    const isCountryMismatch = checkCountryMismatch({
      partner,
      verification,
    });

    if (isCountryMismatch) {
      effectiveStatus = "declined";
      declineReason = `Your document country (${verification.document?.country}) does not match your account country (${partner.country})`;
    } else {
      identityVerifiedAt = decisionTime ? new Date(decisionTime) : new Date();
    }
  }

  // if not resubmission, clear the sessionUrl and sessionExpiresAt and increment the attempt count
  if (effectiveStatus !== "resubmission_requested") {
    sessionUrl = null;
    sessionExpiresAt = null;
    attemptCount = attemptCount + 1;
  }

  const veriffMetadata = mergeVeriffMetadata(partner.veriffMetadata, {
    attemptCount,
    declineReason,
    sessionExpiresAt,
    sessionUrl,
  });

  const updatedPartner = await prisma.partner.update({
    where: {
      id: partner.id,
      identityVerifiedAt: null,
    },
    data: {
      identityVerificationStatus: veriffStatusMap[effectiveStatus],
      identityVerifiedAt,
      veriffMetadata,
    },
    select: {
      identityVerificationStatus: true,
      name: true,
      email: true,
    },
  });

  await sendEmailNotification({
    partner: updatedPartner,
    attemptId,
    failureReasonText: declineReason || "",
  });

  return logAndRespond("[Veriff Webhook] Decision event handled successfully.");
};

function checkCountryMismatch({
  partner,
  verification,
}: {
  partner: Pick<Partner, "id" | "country">;
  verification: VeriffDecisionEvent["verification"];
}): boolean {
  const veriffCountry = (
    verification.document?.country || verification.person?.nationality
  )?.toUpperCase();

  // If either country is missing, skip the check — don't decline for missing data
  if (!veriffCountry || !partner.country) {
    return false;
  }

  return partner.country.toUpperCase() !== veriffCountry;
}

async function sendEmailNotification({
  partner,
  attemptId,
  failureReasonText,
}: {
  partner: Pick<Partner, "name" | "email" | "identityVerificationStatus">;
  attemptId: string;
  failureReasonText: string;
}) {
  const { name, email, identityVerificationStatus } = partner;

  if (!email) {
    return;
  }

  if (identityVerificationStatus === "approved") {
    return await sendEmail({
      to: email,
      subject: "Your identity has been verified",
      headers: {
        "Idempotency-Key": `${attemptId}-verified`,
      },
      react: PartnerIdentityVerified({
        partner: {
          name,
          email,
        },
      }),
    });
  }

  if (identityVerificationStatus === "resubmissionRequested") {
    return await sendEmail({
      to: email,
      subject: "Please resubmit your identity verification",
      headers: {
        "Idempotency-Key": `${attemptId}-resubmission-requested`,
      },
      react: PartnerIdentityVerificationFailed({
        failureType: "resubmissionRequested",
        failureReasonText,
        partner: {
          name,
          email,
        },
      }),
    });
  }

  if (identityVerificationStatus === "declined") {
    return await sendEmail({
      to: email,
      subject: "Your identity verification was declined",
      headers: {
        "Idempotency-Key": `${attemptId}-verification-failed`,
      },
      react: PartnerIdentityVerificationFailed({
        failureType: "declined",
        failureReasonText,
        partner: {
          name,
          email,
        },
      }),
    });
  }
}
