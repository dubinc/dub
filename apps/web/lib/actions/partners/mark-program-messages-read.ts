"use server";

import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
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

    const { partnerId, programId } = await getProgramEnrollmentOrThrow({
      programId: programSlug,
      partnerId: partner.id,
    });

    await prisma.message.updateMany({
      where: {
        partnerId,
        programId,
        readInApp: null,
        senderPartnerId: null,
      },
      data: {
        readInApp: new Date(),
      },
    });
  });
