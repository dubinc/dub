import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { withAxiom } from "@/lib/axiom/server";
import { intercomUninstallWebhookSchema } from "@/lib/integrations/intercom/schema";
import { prisma } from "@/lib/prisma";
import { INTERCOM_INTEGRATION_ID } from "@dub/utils";
import { logAndRespond } from "../../../cron/utils";
import { verifyIntercomWebhookSignature } from "../verify-webhook-signature";

// POST /api/intercom/webhook/uninstall – notified when someone uninstalls the app or revokes access through any means
export const POST = withAxiom(async (req) => {
  try {
    const rawBody = await verifyIntercomWebhookSignature(req);
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
