import { withPartnerProfile } from "@/lib/auth/partner";
import { countMessagesQuerySchema } from "@/lib/zod/schemas/messages";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/partner-profile/messages/count - count messages for a partner
export const GET = withPartnerProfile(
  async ({ partner, searchParams, partnerUser: { assignedProgramIds } }) => {
    const { unread } = countMessagesQuerySchema.parse(searchParams);

    const count = await prisma.message.count({
      where: {
        partnerId: partner.id,
        ...(assignedProgramIds.length > 0 && {
          programId: {
            in: assignedProgramIds,
          },
        }),
        ...(unread !== undefined && {
          // Only count messages from the program
          senderPartnerId: null,
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
);
