"use server";

import { createId } from "@/lib/api/create-id";
import { DubApiError } from "@/lib/api/errors";
import { getNetworkInvitesUsage } from "@/lib/api/partners/get-network-invites-usage";
import { partnerReachableByProgramWhereInput } from "@/lib/api/partners/partner-reachable-by-program-where-input";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { qstash } from "@/lib/cron";
import { forwardProgramMessageToIntercom } from "@/lib/integrations/intercom/forward-message";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN_WITH_NGROK, INTERCOM_INTEGRATION_ID } from "@dub/utils";
import * as z from "zod/v4";
import { authActionClient } from "../actions/safe-action";
import { throwIfNoPermission } from "../actions/throw-if-no-permission";
import { MessageSchema, messagePartnerSchema } from "./schemas";
import {
  mapMessageAttachmentsForCreate,
  messageAttachmentsOrderBy,
} from "./utils";

const schema = messagePartnerSchema
  .extend({
    workspaceId: z.string(),
  })
  .refine(
    (data) => data.text.trim().length > 0 || data.attachments.length > 0,
    {
      message: "Message must contain text or at least one attachment.",
    },
  );

// Message a partner
export const messagePartnerAction = authActionClient
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerId, text, attachments } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredPermissions: ["messages.write"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);
    if (!getPlanCapabilities(workspace.plan).canMessagePartners) {
      throw new DubApiError({
        code: "forbidden",
        message:
          "Messaging is only available on Advanced and Enterprise plans. Upgrade to get access.",
      });
    }

    // Make sure partner is either approved or trusted in the partner network, enrolled in the program, or already has a message with the program
    const {
      _count,
      programs,
      messages: partnerReplies,
      ...partner
    } = await prisma.partner.findFirstOrThrow({
      where: {
        id: partnerId,
        ...partnerReachableByProgramWhereInput(programId),
      },
      include: {
        _count: {
          select: {
            messages: {
              where: {
                programId,
                senderPartnerId: null,
              },
            },
          },
        },
        // Any partner reply unlocks further program messages
        messages: {
          where: {
            programId,
            senderPartnerId: { not: null },
          },
          take: 1,
          select: { id: true },
        },
        programs: {
          where: {
            programId,
          },
          select: {
            status: true,
          },
        },
      },
    });

    const enrollment = programs[0];
    const programMessageCount = _count.messages;
    const partnerHasReplied = partnerReplies.length > 0;

    // Cap unsolicited outreach while invited / not enrolled; unlock once partner replies
    if (
      (!enrollment || enrollment.status === "invited") &&
      !partnerHasReplied &&
      programMessageCount >= 1
    ) {
      throw new DubApiError({
        code: "forbidden",
        message: "You can only send one message until the partner replies.",
      });
    }

    // if partner is not enrolled in the program and it's the first program message
    // it means the program is reaching out via the partner network
    if (!enrollment && programMessageCount === 0) {
      const networkInvitesUsage = await getNetworkInvitesUsage(workspace);

      if (networkInvitesUsage >= workspace.networkInvitesLimit) {
        throw new DubApiError({
          code: "forbidden",
          message: "You have reached your partner network invitations limit.",
        });
      }

      await prisma.discoveredPartner.upsert({
        where: {
          programId_partnerId: {
            programId,
            partnerId,
          },
        },
        create: {
          id: createId({ prefix: "dpn_" }),
          programId,
          partnerId,
          messagedAt: new Date(),
        },
        update: {
          messagedAt: new Date(),
        },
      });
    }

    const keyPrefix = `messages/${programId}/`;

    for (const attachment of attachments) {
      if (!attachment.storageKey.startsWith(keyPrefix)) {
        throw new Error("Invalid attachment storage key.");
      }
    }

    const message = await prisma.message.create({
      data: {
        id: createId({ prefix: "msg_" }),
        programId,
        partnerId,
        senderUserId: user.id,
        text,
        ...(attachments.length > 0 && {
          attachments: {
            create: mapMessageAttachmentsForCreate(attachments),
          },
        }),
      },
      include: {
        senderUser: true,
        senderPartner: true,
        attachments: {
          orderBy: messageAttachmentsOrderBy,
        },
      },
    });

    (async () => {
      const intercomInstallation = await prisma.installedIntegration.findFirst({
        where: {
          projectId: workspace.id,
          integrationId: INTERCOM_INTEGRATION_ID,
        },
        select: {
          id: true,
          credentials: true,
        },
      });

      await Promise.allSettled([
        qstash.publishJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/messages/notify-partner`,
          body: {
            programId,
            partnerId,
            lastMessageId: message.id,
          },
          delay: 60 * 3, // 3 minute delay for a chance to read + batching multiple messages
        }),

        intercomInstallation &&
          forwardProgramMessageToIntercom({
            program: { id: programId, workspaceId: workspace.id },
            partner,
            message,
            intercomInstallation,
          }),
      ]);
    })();

    return {
      message: MessageSchema.parse(message),
    };
  });
