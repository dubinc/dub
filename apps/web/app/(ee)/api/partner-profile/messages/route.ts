import { withPartnerProfile } from "@/lib/auth/partner";
import { enrichMessage } from "@/lib/messages/enrich";
import {
  ProgramMessagesSchema,
  getProgramMessagesQuerySchema,
} from "@/lib/messages/schemas";
import { messageAttachmentsOrderBy } from "@/lib/messages/utils";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/partner-profile/messages - get messages grouped by program
export const GET = withPartnerProfile(async ({ partner, searchParams }) => {
  const {
    programSlug,
    sortBy,
    sortOrder,
    messagesLimit: messagesLimitArg,
  } = getProgramMessagesQuerySchema.parse(searchParams);

  const messagesLimit = messagesLimitArg ?? (programSlug ? undefined : 10);

  const programs = await prisma.program.findMany({
    where: {
      ...(programSlug
        ? {
            slug: programSlug,
            OR: [
              // Partner is enrolled in the program
              // in this case, return messages regardless of messaging enabled status which is passed to the UI
              {
                partners: {
                  some: {
                    partnerId: partner.id,
                  },
                },
              },
              {
                // Partner has received a direct message from the program
                messages: {
                  some: {
                    partnerId: partner.id,
                    senderPartnerId: null, // Sent by the program
                  },
                },
              },
            ],
          }
        : {
            OR: [
              // Program has messaging enabled and partner has 1+ messages with the program
              {
                messagingEnabledAt: {
                  not: null,
                },
                messages: {
                  some: {
                    partnerId: partner.id,
                  },
                },
              },

              // Partner has received a direct message from the program
              {
                messages: {
                  some: {
                    partnerId: partner.id,
                    senderPartnerId: null, // Sent by the program
                  },
                },
              },
            ],
          }),
    },
    include: {
      messages: {
        where: {
          partnerId: partner.id,
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

  const sortedMessages = programs
    // Sort by unread first, then by most recent message
    .sort((a, b) => {
      const aUnread = a.messages.some(
        (m) => !m.senderPartnerId && !m.readInApp,
      );
      const bUnread = b.messages.some(
        (m) => !m.senderPartnerId && !m.readInApp,
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
    sortedMessages.map(async ({ messages, ...program }) => ({
      program,
      messages: await Promise.all(messages.map(enrichMessage)),
    })),
  );

  return NextResponse.json(ProgramMessagesSchema.parse(enriched));
});
