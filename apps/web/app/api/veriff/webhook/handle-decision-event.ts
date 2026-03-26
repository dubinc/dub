import { veriffDecisionEventSchema } from "@/lib/veriff/schema";
import { sendEmail } from "@dub/email";
import PartnerIdentityVerificationFailed from "@dub/email/templates/partner-identity-verification-failed";
import PartnerIdentityVerificationResubmission from "@dub/email/templates/partner-identity-verification-resubmission";
import PartnerIdentityVerified from "@dub/email/templates/partner-identity-verified";
import { prisma } from "@dub/prisma";
import {
  IdentityVerificationStatus,
  Partner,
  Prisma,
} from "@dub/prisma/client";
import { createHash } from "crypto";
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
  const { id, status, decisionTime, reason } = verification;

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
    },
  });

  if (!partner) {
    console.warn("[Veriff Webhook] No partner found for session.");
    return new Response("OK");
  }

  if (partner.identityVerifiedAt) {
    console.warn("[Veriff Webhook] Partner already verified.");
    return new Response("OK");
  }

  const toUpdate: Prisma.PartnerUpdateInput = {
    identityVerificationStatus: veriffStatusMap[status],
  };

  // If the verification was approved, compute the identity hash and check for duplicates and country mismatch
  if (status === "approved") {
    const identityHash = computeIdentityHash(verification);

    const isDuplicate = await checkDuplicateIdentity({
      partner,
      identityHash,
    });

    if (isDuplicate) {
      return;
    }

    const isCountryMismatch = await checkCountryMismatch({
      partner,
      verification,
    });

    if (isCountryMismatch) {
      return;
    }

    // All checks passed — approve
    toUpdate.identityVerifiedAt = decisionTime
      ? new Date(decisionTime)
      : undefined;

    if (identityHash) {
      toUpdate.veriffIdentityHash = identityHash;
    }

    toUpdate.identityVerificationDeclineReason = null;
  }

  // If the verification failed, reset the session
  else if (["expired", "abandoned", "declined"].includes(status)) {
    toUpdate.identityVerifiedAt = null;
    toUpdate.veriffSessionExpiresAt = null;
    toUpdate.veriffSessionUrl = null;
    toUpdate.veriffSessionId = null;
    toUpdate.identityVerificationDeclineReason = reason || null;
  }

  // Can reuse the same session for resubmission
  else if (status === "resubmission_requested") {
    toUpdate.identityVerifiedAt = null;
    toUpdate.identityVerificationDeclineReason = reason || null;
  }

  if (["approved", "declined"].includes(status)) {
    toUpdate.identityVerificationAttemptCount = {
      increment: 1,
    };
  }

  await prisma.partner.update({
    where: {
      id: partner.id,
      identityVerifiedAt: null,
    },
    data: toUpdate,
  });

  if (partner.email) {
    if (status === "approved") {
      await sendEmail({
        to: partner.email,
        subject: "Your identity has been verified",
        react: PartnerIdentityVerified({
          partner: {
            name: partner.name,
            email: partner.email,
          },
        }),
      });
    }

    if (status === "declined") {
      await sendEmail({
        to: partner.email,
        subject: "Your identity verification was declined",
        react: PartnerIdentityVerificationFailed({
          partner: {
            name: partner.name,
            email: partner.email,
          },
          declineReason: reason || "",
        }),
      });
    }

    if (status === "resubmission_requested") {
      await sendEmail({
        to: partner.email,
        subject: "Additional documents needed for identity verification",
        react: PartnerIdentityVerificationResubmission({
          partner: {
            name: partner.name,
            email: partner.email,
          },
        }),
      });
    }
  }
};

async function declinePartner({
  partner,
  reason,
}: {
  partner: Pick<Partner, "id" | "name" | "email">;
  reason: string;
}) {
  await prisma.partner.update({
    where: {
      id: partner.id,
      identityVerifiedAt: null,
    },
    data: {
      identityVerificationStatus: "declined",
      identityVerificationDeclineReason: reason,
      veriffSessionExpiresAt: null,
      veriffSessionUrl: null,
      veriffSessionId: null,
    },
  });

  if (partner.email) {
    await sendEmail({
      to: partner.email,
      subject: "Your identity verification was declined",
      react: PartnerIdentityVerificationFailed({
        partner: {
          name: partner.name,
          email: partner.email,
        },
        declineReason: reason,
      }),
    });
  }
}

async function checkDuplicateIdentity({
  partner,
  identityHash,
}: {
  partner: Pick<Partner, "id" | "name" | "email">;
  identityHash: string | null;
}) {
  if (!identityHash) return false;

  const duplicatePartner = await prisma.partner.findFirst({
    where: {
      veriffIdentityHash: identityHash,
      id: {
        not: partner.id,
      },
    },
    select: {
      id: true,
    },
  });

  if (!duplicatePartner) return false;

  console.warn(
    `[Veriff Webhook] Duplicate identity detected. Partner ${partner.id} matches ${duplicatePartner.id}`,
  );

  await declinePartner({
    partner,
    reason: "This identity has already been verified on another account.",
  });

  return true;
}

async function checkCountryMismatch({
  partner,
  verification,
}: {
  partner: Pick<Partner, "id" | "country" | "name" | "email">;
  verification: VeriffDecisionEvent["verification"];
}) {
  const veriffCountry = (
    verification.document?.country || verification.person?.nationality
  )?.toUpperCase();

  if (
    !partner.country ||
    !veriffCountry ||
    partner.country.toUpperCase() === veriffCountry
  ) {
    return false;
  }

  console.warn(
    `[Veriff Webhook] Country mismatch for partner ${partner.id}. Partner: ${partner.country}, Veriff: ${veriffCountry}`,
  );

  await declinePartner({
    partner,
    reason: "Your document country does not match your account country.",
  });

  return true;
}

function computeIdentityHash(
  verification: VeriffDecisionEvent["verification"],
) {
  const { person, document } = verification;

  // Prefer document number (passport/ID number) — strongest unique signal
  if (document?.number) {
    const input = [
      "doc",
      document.number.toLowerCase().trim(),
      document.country?.toUpperCase().trim() ?? "",
    ].join("|");

    return createHash("sha256").update(input).digest("hex");
  }

  // Fall back to name + date of birth
  if (person?.firstName && person?.lastName && person?.dateOfBirth) {
    const input = [
      "person",
      person.firstName.toLowerCase().trim(),
      person.lastName.toLowerCase().trim(),
      person.dateOfBirth.trim(),
    ].join("|");

    return createHash("sha256").update(input).digest("hex");
  }

  return null;
}
