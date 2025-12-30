"use server";

import { prisma } from "@dub/prisma";
import { z } from "zod";
import { authPartnerActionClient } from "../safe-action";

const schema = z.object({
  programSlug: z.string(),
});

// Mark program messages as read
export const markProgramMessagesReadAction = authPartnerActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { partner } = ctx;
    const { programSlug } = parsedInput;

    const program = await prisma.program.findFirstOrThrow({
      select: {
        id: true,
      },
      where: {
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
      },
    });

    await prisma.message.updateMany({
      where: {
        partnerId: partner.id,
        programId: program.id,
        readInApp: null,
        senderPartnerId: null,
      },
      data: {
        readInApp: new Date(),
      },
    });
  });
