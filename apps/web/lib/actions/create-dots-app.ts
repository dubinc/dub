"use server";

import { prisma } from "@/lib/prisma";
import { createNewDotsApp } from "../dots/create-dots-app";
import z from "../zod";
import { authActionClient } from "./safe-action";

const schema = z.object({
  workspaceId: z.string(),
});

// Create a new Dots app for a workspace
export const createDotsApp = authActionClient
  .schema(schema)
  .action(async ({ ctx }) => {
    const { workspace } = ctx;

    const dotsApp = await createNewDotsApp({ workspace });

    await prisma.project.update({
      where: {
        id: workspace.id,
      },
      data: {
        dotsAppId: dotsApp.id,
      },
    });

    return dotsApp;
  });
