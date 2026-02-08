import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { countMessagesQuerySchema } from "@/lib/zod/schemas/messages";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/messages/count - count messages for a program
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { unread } = countMessagesQuerySchema.parse(searchParams);

    const count = await prisma.message.count({
      where: {
        programId,
        ...(unread !== undefined && {
          // Only count messages from the partner
          senderPartnerId: {
            not: null,
          },
          readInApp: unread
            ? // Only count unread messages
              null
            : {
                // Only count read messages
                not: null,
              },
        }),
      },
    });

    return NextResponse.json(count);
  },
  {
    requiredPermissions: ["messages.read"],
    requiredPlan: ["advanced", "enterprise"],
  },
);
