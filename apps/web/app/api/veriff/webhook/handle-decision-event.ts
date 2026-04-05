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
  let effectiveReason = reason || null;

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

  // undefined = don't update, null = clear the field
  let identityVerifiedAt: Date | null | undefined = undefined;
  let veriffSessionId: string | null | undefined = undefined;
  let { sessionUrl, attemptCount, declineReason, sessionExpiresAt } =
    parseVeriffMetadata(partner.veriffMetadata);

  // If the verification was approved, compute the identity hash and check for duplicates and country mismatch
  if (effectiveStatus === "approved") {
    const isCountryMismatch = checkCountryMismatch({
      partner,
      verification,
    });

    if (isCountryMismatch) {
      effectiveStatus = "declined";
      effectiveReason = `Your document country (${verification.document?.country}) does not match your account country (${partner.country})`;
    } else {
      declineReason = null;
      sessionExpiresAt = null;
      sessionUrl = null;
      identityVerifiedAt = decisionTime ? new Date(decisionTime) : new Date();
    }
  }

  // If the verification failed, reset the session
  if (["expired", "abandoned", "declined"].includes(effectiveStatus)) {
    identityVerifiedAt = null;
    veriffSessionId = null;
    sessionExpiresAt = null;
    sessionUrl = null;
    declineReason = effectiveReason;
  }

  // Can reuse the same session for resubmission
  if (effectiveStatus === "resubmission_requested") {
    identityVerifiedAt = null;
    declineReason = effectiveReason;
  }

  if (["approved", "declined"].includes(effectiveStatus)) {
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
      veriffSessionId,
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
    failureReasonText: effectiveReason || "",
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
