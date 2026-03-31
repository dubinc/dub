import { veriffSessionEventSchema } from "@/lib/veriff/schema";
import { mergeVeriffMetadata } from "@/lib/veriff/veriff-metadata";
import { prisma } from "@dub/prisma";
import { logAndRespond } from "app/(ee)/api/cron/utils";
import * as z from "zod/v4";

type VeriffSessionEvent = z.infer<typeof veriffSessionEventSchema>;

export const handleSessionEvent = async ({
  id,
  action,
}: VeriffSessionEvent) => {
  const partner = await prisma.partner.findUnique({
    where: {
      veriffSessionId: id,
    },
    select: {
      id: true,
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

  const veriffMetadata = mergeVeriffMetadata(partner.veriffMetadata, {
    declineReason: null,
  });

  await prisma.partner.update({
    where: {
      id: partner.id,
      identityVerifiedAt: null,
    },
    data: {
      identityVerificationStatus: action,
      veriffIdentityHash: null,
      veriffMetadata,
    },
  });

  return logAndRespond("[Veriff Webhook] Session event handled.");
};
