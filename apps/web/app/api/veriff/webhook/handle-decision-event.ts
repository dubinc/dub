import { veriffDecisionEventSchema } from "@/lib/veriff/schema";
import { prisma } from "@dub/prisma";
import { IdentityVerificationStatus, Prisma } from "@dub/prisma/client";
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
  verification: { id, status, decisionTime },
}: VeriffDecisionEvent) => {
  const partner = await prisma.partner.findUnique({
    where: {
      veriffSessionId: id,
    },
    select: {
      id: true,
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

  if (status === "approved") {
    toUpdate["identityVerifiedAt"] = decisionTime
      ? new Date(decisionTime)
      : undefined;
  }

  if (status === "resubmission_requested") {
    toUpdate["identityVerifiedAt"] = null;
    toUpdate["veriffSessionExpiresAt"] = null;
    toUpdate["veriffSessionUrl"] = null;
    toUpdate["veriffSessionId"] = null;
  }

  if (status === "expired") {
    toUpdate["veriffSessionExpiresAt"] = null;
    toUpdate["veriffSessionUrl"] = null;
    toUpdate["veriffSessionId"] = null;
  }

  await prisma.partner.update({
    where: {
      id: partner.id,
      identityVerifiedAt: null,
    },
    data: {
      ...toUpdate,
    },
  });
};
