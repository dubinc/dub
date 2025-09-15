"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { prisma } from "@dub/prisma";
import {
  ProgramPartnerCommentSchema,
  createProgramPartnerCommentSchema,
} from "../../zod/schemas/programs";
import { authActionClient } from "../safe-action";

// Create a partner comment
export const createPartnerCommentAction = authActionClient
  .schema(createProgramPartnerCommentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerId, text, createdAt } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    await getProgramEnrollmentOrThrow({
      partnerId,
      programId,
    });

    const comment = await prisma.programPartnerComment.create({
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
      comment: ProgramPartnerCommentSchema.parse(comment),
    };
  });
