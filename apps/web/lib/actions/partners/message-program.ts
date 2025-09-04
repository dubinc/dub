"use server";

import { createId } from "@/lib/api/create-id";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { prisma } from "@dub/prisma";
import {
  MessageSchema,
  messageProgramSchema,
} from "../../zod/schemas/messages";
import { authPartnerActionClient } from "../safe-action";

// Message a program
export const messageProgramAction = authPartnerActionClient
  .schema(messageProgramSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { partner } = ctx;
    const { programSlug, text, createdAt } = parsedInput;

    const enrollment = await getProgramEnrollmentOrThrow({
      programId: programSlug,
      partnerId: partner.id,
    });

    const message = await prisma.message.create({
      data: {
        id: createId({ prefix: "msg_" }),
        programId: enrollment.programId,
        partnerId: partner.id,
        senderPartnerId: partner.id,
        text,
        createdAt,
      },
      include: {
        senderUser: true,
        senderPartner: true,
      },
    });

    // TODO: [Messages] Send email to program owner(s) and track read status

    return { message: MessageSchema.parse(message) };
  });
