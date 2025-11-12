import { withPartnerProfile } from "@/lib/auth/partner";
import {
  ProgramMessagesSchema,
  getProgramMessagesQuerySchema,
} from "@/lib/zod/schemas/messages";
import { prisma } from "@dub/prisma";
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
              {
                partners: {
                  some: {
                    partnerId: partner.id,
                  },
                },
              },
              {
                messages: {
                  some: {
                    partnerId: partner.id,
                  },
                },
              },
            ],
          }
        : {
            messages: {
              some: {
                partnerId: partner.id,
              },
            },
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
        // Sort by most recent message
        .sort((a, b) =>
          sortOrder === "desc"
            ? (b.messages?.[0]?.[sortBy]?.getTime() ?? 0) -
              (a.messages?.[0]?.[sortBy]?.getTime() ?? 0)
            : (a.messages?.[0]?.[sortBy]?.getTime() ?? 0) -
              (b.messages?.[0]?.[sortBy]?.getTime() ?? 0),
        )
        // Map to {program, messages}
        .map(({ messages, ...program }) => ({
          program,
          messages,
        })),
    ),
  );
});
