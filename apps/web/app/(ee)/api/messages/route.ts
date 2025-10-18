import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  PartnerMessagesSchema,
  getPartnerMessagesQuerySchema,
} from "@/lib/zod/schemas/messages";
import { prisma } from "@dub/prisma";
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

    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        programId,
        ...(partnerId
          ? { partnerId }
          : {
              partner: {
                messages: {
                  some: {
                    programId,
                  },
                },
              },
            }),
      },
      take: 1000, // TODO: add pagination later
      include: {
        partner: {
          include: {
            messages: {
              where: {
                programId,
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
      PartnerMessagesSchema.parse(
        programEnrollments
          // Sort by most recent message
          .sort((a, b) =>
            sortOrder === "desc"
              ? (b.partner.messages?.[0]?.[sortBy]?.getTime() ?? 0) -
                (a.partner.messages?.[0]?.[sortBy]?.getTime() ?? 0)
              : (a.partner.messages?.[0]?.[sortBy]?.getTime() ?? 0) -
                (b.partner.messages?.[0]?.[sortBy]?.getTime() ?? 0),
          )
          // Map to {partner, messages}
          .map(({ partner: { messages, ...partner } }) => ({
            partner,
            messages,
          })),
      ),
    );
  },
  {
    requiredPermissions: ["messages.read"],
    requiredPlan: ["advanced", "enterprise"],
  },
);
