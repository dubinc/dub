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

    const { partnerId, messagesLimit: messagesLimitArg } =
      getPartnerMessagesQuerySchema.parse(searchParams);

    const messagesLimit = messagesLimitArg ?? (partnerId ? undefined : 10);

    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        programId,
        ...(partnerId && { partnerId }),
        partner: {
          messages: {
            some: {
              programId,
            },
          },
        },
      },
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
                createdAt: "desc",
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
          .sort(
            (a, b) =>
              b.partner.messages[0].createdAt.getTime() -
              a.partner.messages[0].createdAt.getTime(),
          )
          // Map to {partner, messages}
          .map(({ partner }) => ({
            partner,
            messages: partner.messages,
          })),
      ),
    );
  },
  {
    requiredPermissions: ["messages.read"],
    requiredPlan: [
      "business",
      "business extra",
      "business max",
      "business plus",
      "advanced",
      "enterprise",
    ],
  },
);
