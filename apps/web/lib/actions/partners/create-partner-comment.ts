"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { prisma } from "@dub/prisma";
import {
  PartnerCommentSchema,
  createPartnerCommentSchema,
} from "../../zod/schemas/programs";
import { authActionClient } from "../safe-action";

// Create a partner comment
export const createPartnerCommentAction = authActionClient
  .schema(createPartnerCommentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerId, text, createdAt } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    await getProgramEnrollmentOrThrow({
      partnerId,
      programId,
      include: {},
    });

    const comment = await prisma.partnerComment.create({
      data: {
        programId,
        partnerId,
        userId: user.id,
        text,
        createdAt,
      },
      include: {
        user: true,
      },
    });

    return {
      comment: PartnerCommentSchema.parse(comment),
    };
  });
