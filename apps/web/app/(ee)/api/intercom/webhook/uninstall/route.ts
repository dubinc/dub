import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { withAxiom } from "@/lib/axiom/server";
import { intercomUninstallWebhookSchema } from "@/lib/integrations/intercom/schema";
import { prisma } from "@dub/prisma";
import { INTERCOM_INTEGRATION_ID } from "@dub/utils";
import crypto from "crypto";
import { logAndRespond } from "../../../cron/utils";

const INTERCOM_CLIENT_SECRET = process.env.INTERCOM_CLIENT_SECRET || "";

// POST /api/intercom/webhook/uninstall – notified when someone uninstalls the app or revokes access through any means
export const POST = withAxiom(async (req) => {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("X-Hub-Signature");

    if (!signature) {
      throw new DubApiError({
        code: "bad_request",
        message: "Missing X-Hub-Signature header.",
      });
    }

    if (!INTERCOM_CLIENT_SECRET) {
      throw new DubApiError({
        code: "internal_server_error",
        message: "Missing INTERCOM_CLIENT_SECRET environment variable.",
      });
    }

    const expectedSignature =
      "sha1=" +
      crypto
        .createHmac("sha1", INTERCOM_CLIENT_SECRET)
        .update(rawBody)
        .digest("hex");

    const isSignatureValid = crypto.timingSafeEqual(
      Uint8Array.from(Buffer.from(signature, "utf8")),
      Uint8Array.from(Buffer.from(expectedSignature, "utf8")),
    );

    if (!isSignatureValid) {
      throw new DubApiError({
        code: "unauthorized",
        message: "Invalid webhook signature.",
      });
    }

    const body = JSON.parse(rawBody);

    const { app_id: intercomWorkspaceId } =
      intercomUninstallWebhookSchema.parse(body);

    const installation = await prisma.installedIntegration.findFirst({
      where: {
        integrationId: INTERCOM_INTEGRATION_ID,
        credentials: {
          path: "$.appId",
          equals: intercomWorkspaceId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!installation) {
      return logAndRespond(
        `[Intercom] Installation not found for Intercom workspace ${intercomWorkspaceId}.`,
      );
    }

    await prisma.installedIntegration.delete({
      where: {
        id: installation.id,
      },
    });

    return logAndRespond(
      "[Intercom] Removed Intercom installation from the workspace.",
    );
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
});
