"use server";

import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import z from "../zod";
import { authActionClient } from "./safe-action";

const schema = z.object({
  workspaceId: z.string(),
});

// Create publishable key
export const createPublishableKey = authActionClient
  .schema(schema)
  .action(async ({ ctx }) => {
    const { workspace } = ctx;

    if (!workspace.conversionEnabled) {
      throw new Error("Conversion is not enabled for this workspace.");
    }

    if (workspace.publishableKey) {
      throw new Error("Publishable key already exists.");
    }

    const publishableKey = `dub_publishable_${nanoid(24)}`;

    await prisma.project.update({
      where: {
        id: workspace.id,
      },
      data: {
        publishableKey,
      },
    });

    return {
      publishableKey,
    };
  });
