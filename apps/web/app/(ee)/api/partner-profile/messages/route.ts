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

  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      partnerId: partner.id,
      program: {
        ...(programSlug
          ? { slug: programSlug }
          : {
              messages: {
                some: {
                  partnerId: partner.id,
                },
              },
            }),
      },
    },
    include: {
      program: {
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
      },
    },
  });

  return NextResponse.json(
    ProgramMessagesSchema.parse(
      programEnrollments
        // Sort by most recent message
        .sort((a, b) =>
          sortOrder === "desc"
            ? b.program.messages[0][sortBy].getTime() -
              a.program.messages[0][sortBy].getTime()
            : a.program.messages[0][sortBy].getTime() -
              b.program.messages[0][sortBy].getTime(),
        )
        // Map to {program, messages}
        .map(({ program: { messages, ...program } }) => ({
          program,
          messages,
        })),
    ),
  );
});
