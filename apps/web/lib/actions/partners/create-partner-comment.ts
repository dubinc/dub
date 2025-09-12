"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { prisma } from "@dub/prisma";
import { createProgramPartnerCommentSchema } from "../../zod/schemas/programs";
import { authActionClient } from "../safe-action";

// Create a partner comment
export const createPartnerCommentAction = authActionClient
  .schema(createProgramPartnerCommentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerId, text } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const programEnrollment = await getProgramEnrollmentOrThrow({
      partnerId,
      programId,
      includePartner: true,
    });

    await prisma.programPartnerComment.create({
      data: {
        programEnrollmentId: programEnrollment.id,
        userId: user.id,
        text,
      },
    });
  });
