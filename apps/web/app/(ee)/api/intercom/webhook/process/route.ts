import { withAxiom } from "@/lib/axiom/server";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import {
  intercomCredentialsSchema,
  intercomWebhookSchema,
} from "@/lib/integrations/intercom/schema";
import { prisma } from "@dub/prisma";
import { INTERCOM_INTEGRATION_ID } from "@dub/utils";
import { logAndRespond } from "../../../cron/utils";
import { handleConversationAdminReplied } from "./conversation-admin-replied";

// POST /api/intercom/webhook/process
export const POST = withAxiom(async (req) => {
  const startTime = Date.now();

  let body: any;
  let workspaceId: string | undefined;

  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    body = JSON.parse(rawBody);

    const {
      topic,
      app_id: intercomWorkspaceId,
      data,
    } = intercomWebhookSchema.parse(body);

    // Find the installation
    const installation = await prisma.installedIntegration.findFirst({
      where: {
        integrationId: INTERCOM_INTEGRATION_ID,
        credentials: {
          path: "$.appId",
          equals: intercomWorkspaceId,
        },
      },
      include: {
        project: {
          select: {
            id: true,
            programs: {
              select: {
                id: true,
                deactivatedAt: true,
                workspaceId: true,
              },
            },
          },
        },
      },
    });

    if (!installation) {
      return logAndRespond(
        `[Intercom] Installation not found for Intercom workspace ${intercomWorkspaceId}.`,
      );
    }

    const {
      credentials,
      project: { programs },
    } = installation;

    if (programs.length === 0) {
      return logAndRespond(
        `[Intercom] No programs found for Intercom workspace ${intercomWorkspaceId}.`,
      );
    }

    const program = programs[0];

    if (program.deactivatedAt) {
      return logAndRespond(`[Intercom] Program ${program.id} is deactivated.`);
    }

    const parsedCredentials = intercomCredentialsSchema.parse(credentials);

    if (topic === "conversation.admin.replied") {
      const response = await handleConversationAdminReplied({
        data,
        program,
        installation,
      });

      return logAndRespond(response.message);
    }

    return logAndRespond("OK");
  } catch (error) {
    // const response = handleAndReturnErrorResponse(error);
    // if (workspaceId) {
    //   await captureWebhookLog({
    //     workspaceId,
    //     method: "POST",
    //     path: "/intercom/webhook",
    //     statusCode: response.status,
    //     duration: Date.now() - startTime,
    //     requestBody: body,
    //     responseBody: response,
    //     userAgent: req.headers.get("user-agent"),
    //   });
    // }
    //return response;

    return logAndRespond("OK");
  }
});
