import { partnerReachableByProgramWhereInput } from "@/lib/api/partners/partner-reachable-by-program-where-input";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { enrichMessage } from "@/lib/messages/enrich";
import {
  PartnerMessagesSchema,
  getPartnerMessagesQuerySchema,
} from "@/lib/messages/schemas";
import { messageAttachmentsOrderBy } from "@/lib/messages/utils";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/messages - get messages grouped by partner
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const {
      partnerId,
      sortBy,
      sortOrder,
      messagesLimit: messagesLimitArg,
    } = getPartnerMessagesQuerySchema.parse(searchParams);

    const messagesLimit = messagesLimitArg ?? (partnerId ? undefined : 10);

    const partners = await prisma.partner.findMany({
      where: partnerId
        ? {
            id: partnerId,
            // Partner is either approved or trusted in the partner network, enrolled in the program, or already has a message with the program
            ...partnerReachableByProgramWhereInput(programId),
          }
        : {
            // Partner has messages with the program
            messages: {
              some: {
                programId,
              },
            },
          },
      take: 1000, // TODO: add pagination later
      include: {
        messages: {
          where: {
            programId,
          },
          include: {
            senderPartner: true,
            senderUser: true,
            attachments: {
              orderBy: messageAttachmentsOrderBy,
            },
          },
          orderBy: {
            [sortBy]: sortOrder,
          },
          take: messagesLimit,
        },
      },
    });

    const sortedMessages = partners
      // Sort by unread first, then by most recent message
      .sort((a, b) => {
        const aUnread = a.messages.some(
          (m) => m.senderPartnerId && !m.readInApp,
        );
        const bUnread = b.messages.some(
          (m) => m.senderPartnerId && !m.readInApp,
        );

        if (aUnread !== bUnread) {
          return aUnread ? -1 : 1;
        }

        return sortOrder === "desc"
          ? (b.messages?.[0]?.[sortBy]?.getTime() ?? 0) -
              (a.messages?.[0]?.[sortBy]?.getTime() ?? 0)
          : (a.messages?.[0]?.[sortBy]?.getTime() ?? 0) -
              (b.messages?.[0]?.[sortBy]?.getTime() ?? 0);
      });

    const enriched = await Promise.all(
      sortedMessages.map(async ({ messages, ...partner }) => ({
        partner,
        messages: await Promise.all(messages.map(enrichMessage)),
      })),
    );

    return NextResponse.json(PartnerMessagesSchema.parse(enriched));
  },
  {
    requiredPermissions: ["messages.read"],
    requiredPlan: ["advanced", "enterprise"],
  },
);
