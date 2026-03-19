import { veriffDecisionWebhookSchema } from "@/lib/veriff/schema";
import { prisma } from "@dub/prisma";
import { IdentityVerificationStatus } from "@dub/prisma/client";
import crypto from "crypto";

const VERIFF_DECISION_CODE_MAP: Record<
  number,
  {
    status: IdentityVerificationStatus;
    setVerifiedAt: boolean;
  }
> = {
  9001: { status: "approved", setVerifiedAt: true },
  9102: { status: "declined", setVerifiedAt: false },
  9103: { status: "resubmissionRequested", setVerifiedAt: false },
  9104: { status: "expired", setVerifiedAt: false },
  9121: { status: "pending", setVerifiedAt: false }, // manual review
};

// POST /api/veriff/webhook - receive Veriff decision webhooks
export const POST = async (req: Request) => {
  const rawBody = await req.text();

  const signature = req.headers.get("x-hmac-signature");
  const authClient = req.headers.get("x-auth-client");
  const webhookSecret = process.env.VERIFF_WEBHOOK_SECRET;

  if (!signature) {
    return new Response("No signature provided.", { status: 401 });
  }

  if (authClient !== process.env.VERIFF_API_KEY) {
    return new Response("Invalid auth client.", { status: 401 });
  }

  if (!webhookSecret) {
    return new Response("VERIFF_WEBHOOK_SECRET is not configured.", {
      status: 500,
    });
  }

  // TODO:
  // Fix this verification
  const computedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(Buffer.from(rawBody, "base64").toString("utf8"))
    .digest("hex");

  // if (computedSignature !== signature) {
  //   return new Response("Invalid signature.", { status: 400 });
  // }

  const body = JSON.parse(rawBody);
  const result = veriffDecisionWebhookSchema.safeParse(body);

  if (!result.success) {
    console.error("[Veriff Webhook] Invalid payload:", result.error);
    return new Response("Invalid payload.", { status: 400 });
  }

  const { code, vendorData } = result.data;
  const mapping = VERIFF_DECISION_CODE_MAP[code];

  if (!mapping) {
    console.warn(`[Veriff Webhook] Unknown decision code: ${code}`);
    return new Response("OK");
  }

  const partner = await prisma.partner.findUnique({
    where: {
      veriffSessionId: vendorData,
    },
    select: {
      id: true,
    },
  });

  if (!partner) {
    console.warn(
      `[Veriff Webhook] No partner found for session: ${vendorData}`,
    );
    return new Response("OK");
  }

  await prisma.partner.update({
    where: {
      id: partner.id,
    },
    data: {
      identityVerificationStatus: mapping.status,
      ...(mapping.setVerifiedAt && {
        identityVerifiedAt: new Date(),
      }),
    },
  });

  return new Response("OK");
};
