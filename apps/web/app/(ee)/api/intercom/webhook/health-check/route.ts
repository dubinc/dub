import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { withAxiom } from "@/lib/axiom/server";
import {
  intercomCredentialsSchema,
  IntercomHealthCheckResponse,
  intercomHealthCheckWebhookSchema,
} from "@/lib/integrations/intercom/schema";
import { prisma } from "@/lib/prisma";
import { INTERCOM_INTEGRATION_ID } from "@dub/utils";
import { NextResponse } from "next/server";
import { verifyIntercomWebhookSignature } from "../verify-webhook-signature";

// POST /api/intercom/webhook/health-check – health check for the Intercom webhook
export const POST = withAxiom(async (req) => {
  try {
    const rawBody = await verifyIntercomWebhookSignature(req);
    const body = JSON.parse(rawBody);

    const { workspace_id: intercomWorkspaceId } =
      intercomHealthCheckWebhookSchema.parse(body);

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
        credentials: true,
      },
    });

    if (!installation) {
      return NextResponse.json<IntercomHealthCheckResponse>({
        state: "UNHEALTHY",
        message: "You need to re-install with Dub to continue using the app.",
        cta_type: "URL_CTA",
        cta_label: "Finish setup",
        cta_url: "https://app.dub.co/settings/integrations/intercom",
      });
    }

    const { success } = intercomCredentialsSchema.safeParse(
      installation.credentials,
    );

    if (!success) {
      return NextResponse.json<IntercomHealthCheckResponse>({
        state: "UNHEALTHY",
        message: "You need to re-install with Dub to continue using the app.",
        cta_type: "URL_CTA",
        cta_label: "Finish setup",
        cta_url: "https://app.dub.co/settings/integrations/intercom",
      });
    }

    return NextResponse.json<IntercomHealthCheckResponse>({
      state: "OK",
    });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
});
