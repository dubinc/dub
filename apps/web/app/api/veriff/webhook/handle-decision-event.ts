import { veriffDecisionEventSchema } from "@/lib/veriff/schema";
import { prisma } from "@dub/prisma";
import { IdentityVerificationStatus } from "@dub/prisma/client";
import * as z from "zod/v4";

type VeriffDecisionEvent = z.infer<typeof veriffDecisionEventSchema>;

export const handleDecisionEvent = async ({
  verification: { id, status, vendorData, decisionTime },
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
    console.warn(
      `[Veriff Webhook] No partner found for session: ${vendorData}`,
    );
    return new Response("OK");
  }

  if (partner.identityVerifiedAt) {
    console.warn(`[Veriff Webhook] Partner already verified: ${partner.id}`);
    return new Response("OK");
  }

  const veriffStatusMap: Record<
    VeriffDecisionEvent["verification"]["status"],
    IdentityVerificationStatus
  > = {
    approved: "approved",
    declined: "declined",
    expired: "expired",
    resubmission_requested: "resubmissionRequested",
  };

  await prisma.partner.update({
    where: {
      id: partner.id,
    },
    data: {
      identityVerificationStatus: veriffStatusMap[status],
      identityVerifiedAt: decisionTime ? new Date(decisionTime) : undefined,
    },
  });

  return new Response("OK");
};
