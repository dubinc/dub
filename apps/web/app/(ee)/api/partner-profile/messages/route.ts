import { DubApiError } from "@/lib/api/errors";
import { withPartnerProfile } from "@/lib/auth/partner";
import { programScopeFilter } from "@/lib/auth/partner-users/program-scope-filter";
import {
  ProgramMessagesSchema,
  getProgramMessagesQuerySchema,
} from "@/lib/zod/schemas/messages";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/partner-profile/messages - get messages grouped by program
export const GET = withPartnerProfile(
  async ({
    partner,
    searchParams,
    partnerUser: { assignedProgramSlugs, assignedProgramIds },
  }) => {
    const {
      programSlug,
      sortBy,
      sortOrder,
      messagesLimit: messagesLimitArg,
    } = getProgramMessagesQuerySchema.parse(searchParams);

    const messagesLimit = messagesLimitArg ?? (programSlug ? undefined : 10);

    if (
      programSlug &&
      assignedProgramSlugs &&
      !assignedProgramSlugs.includes(programSlug)
    ) {
      throw new DubApiError({
        code: "forbidden",
        message: `You're not authorized to view messages for program ${programSlug}.`,
      });
    }

    const programs = await prisma.program.findMany({
      where: {
        // Partner is not banned from the program
        partners: {
          none: {
            partnerId: partner.id,
            status: "banned",
          },
        },
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
              ...programScopeFilter(assignedProgramIds),
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
          },
          orderBy: {
            [sortBy]: sortOrder,
          },
          take: messagesLimit,
        },
      },
    });

    return NextResponse.json(
      ProgramMessagesSchema.parse(
        programs
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
          })
          // Map to {program, messages}
          .map(({ messages, ...program }) => ({
            program,
            messages,
          })),
      ),
    );
  },
  {
    requiredPermission: "messages.read",
  },
);
