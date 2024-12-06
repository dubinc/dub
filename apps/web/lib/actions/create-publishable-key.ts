"use server";

import { prisma } from "@/lib/prisma";
import { nanoid } from "@dub/utils";
import { getProgramOrThrow } from "../api/programs/get-program";
import z from "../zod";
import { authActionClient } from "./safe-action";

const schema = z.object({
  workspaceId: z.string(),
  programId: z.string(),
});

// Create publishable key for program
export const createPublishableKey = authActionClient
  .schema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspaceId, programId } = parsedInput;

    const program = await getProgramOrThrow({ workspaceId, programId });

    if (program.publishableKey) {
      throw new Error("Publishable key already exists.");
    }

    const publishableKey = `dub_publishable_${nanoid(24)}`;

    await prisma.program.update({
      where: {
        id: program.id,
      },
      data: {
        publishableKey,
      },
    });

    return {
      publishableKey,
    };
  });
