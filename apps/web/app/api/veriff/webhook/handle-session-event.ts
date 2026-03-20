import { veriffSessionEventSchema } from "@/lib/veriff/schema";
import { prisma } from "@dub/prisma";
import * as z from "zod/v4";

type VeriffSessionEvent = z.infer<typeof veriffSessionEventSchema>;

export const handleSessionEvent = async ({
  id,
  action,
  vendorData,
}: VeriffSessionEvent) => {
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

  await prisma.partner.update({
    where: {
      id: partner.id,
      identityVerifiedAt: null,
    },
    data: {
      identityVerificationStatus: action,
    },
  });
};
