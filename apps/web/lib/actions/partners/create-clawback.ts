"use server";

import { createId } from "@/lib/api/create-id";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { createClawbackSchema } from "@/lib/zod/schemas/commissions";
import { prisma } from "@dub/prisma";
import { authActionClient } from "../safe-action";

export const createClawbackAction = authActionClient
  .schema(createClawbackSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { partnerId, amount, description } = parsedInput;

    await getProgramEnrollmentOrThrow({
      programId,
      partnerId,
    });

    await prisma.commission.create({
      data: {
        id: createId({ prefix: "cm_" }),
        programId,
        partnerId,
        description,
        type: "custom",
        amount: 0,
        earnings: -amount,
        quantity: 1,
      },
    });
  });
