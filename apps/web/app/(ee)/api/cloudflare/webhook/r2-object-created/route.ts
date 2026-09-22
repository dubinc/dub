import { assertEnv } from "@/lib/assert-env";
import { logger, toErrorFields } from "@/lib/axiom/server";
import {
  processR2ObjectCreated,
  r2ObjectCreatedNotificationSchema,
} from "@/lib/storage/process-r2-object-created";
import { timingSafeCompare } from "@/lib/webhook/timing-safe-compare";
import { toErrorMessage } from "@dub/utils";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

export const dynamic = "force-dynamic";

const r2ObjectCreatedWebhookBodySchema = z.object({
  notification: r2ObjectCreatedNotificationSchema,
});

function verifyWorkerSecret(req: Request) {
  const webhookSecret = assertEnv("CLOUDFLARE_WORKER_WEBHOOK_SECRET");

  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";

  return timingSafeCompare(token, webhookSecret);
}

// POST /api/cloudflare/webhook/r2-object-created
// Called by the Cloudflare queue consumer Worker (thin forwarder).
export async function POST(req: Request) {
  try {
    if (!verifyWorkerSecret(req)) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const { notification } = r2ObjectCreatedWebhookBodySchema.parse(
      await req.json(),
    );

    const result = await processR2ObjectCreated(notification);

    return NextResponse.json(result);
  } catch (error) {
    logger.error("storage.r2_validate_failed", {
      ...toErrorFields(error),
    });

    return NextResponse.json(
      {
        error: toErrorMessage(error, "Internal server error"),
      },
      { status: 500 },
    );
  }
}
