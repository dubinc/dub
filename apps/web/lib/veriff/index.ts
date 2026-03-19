import { prisma } from "@dub/prisma";
import { Partner } from "@dub/prisma/client";
import crypto from "crypto";
import { veriffFetch } from "./client";

export async function createVeriffSession({
  partner,
}: {
  partner: Pick<Partner, "id" | "name">;
}) {
  const nameParts = partner.name.split(" ");
  const firstName = nameParts[0] || partner.name;
  const lastName = nameParts.slice(1).join(" ") || partner.name;

  const { data, error } = await veriffFetch("/v1/sessions", {
    method: "post",
    body: {
      verification: {
        person: {
          firstName,
          lastName,
        },
        vendorData: partner.id,
        endUserId: partner.id,
      },
    },
  });

  if (error || !data) {
    throw new Error("Failed to create Veriff verification session.");
  }

  await prisma.partner.update({
    where: {
      id: partner.id,
    },
    data: {
      veriffSessionId: data.verification.id,
      identityVerificationStatus: "Pending",
    },
  });

  return {
    verificationId: data.verification.id,
    sessionUrl: data.verification.url,
    sessionToken: data.verification.sessionToken,
  };
}

export function verifyVeriffWebhookSignature({
  rawBody,
  signature,
}: {
  rawBody: string;
  signature: string;
}): boolean {
  const secret = process.env.VERIFF_API_SECRET;

  if (!secret) {
    throw new Error("VERIFF_API_SECRET is not configured.");
  }

  const computedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  return computedSignature === signature;
}
