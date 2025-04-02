"use server";

import { prisma } from "@dub/prisma";
import { DUB_WORKSPACE_ID, nanoid, R2_URL } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { createId } from "../api/create-id";
import { deleteScreenshots } from "../integrations/utils";
import { isStored, storage } from "../storage";
import z from "../zod";
import { createIntegrationSchema } from "../zod/schemas/integration";
import { authActionClient } from "./safe-action";

export const addEditIntegration = authActionClient
  .schema(
    createIntegrationSchema.merge(
      z.object({
        id: z.string().optional(), // if id is provided, we are editing the integration
        workspaceId: z.string(),
      }),
    ),
  )
  .action(async ({ parsedInput, ctx }) => {
    const { id, workspaceId, ...integration } = parsedInput;

    // this is only available for Dub workspace for now
    // we might open this up to other workspaces in the future
    if (workspaceId !== DUB_WORKSPACE_ID) {
      throw new Error("Not authorized");
    }

    const newIntegrationId = createId({ prefix: "int_" });

    if (integration.logo && !isStored(integration.logo)) {
      const result = await storage.upload(
        `integrations/${id || newIntegrationId}_${nanoid(7)}`,
        integration.logo,
      );
      integration.logo = result.url;
    }

    if (id) {
      const oldIntegration = await prisma.integration.findUniqueOrThrow({
        where: { id },
      });

      await prisma.integration.update({
        where: { id },
        data: integration,
      });

      waitUntil(
        (async () => {
          if (
            oldIntegration.logo &&
            integration.logo !== oldIntegration.logo &&
            oldIntegration.logo.startsWith(`${R2_URL}/integrations/${id}`)
          ) {
            await storage.delete(oldIntegration.logo.replace(`${R2_URL}/`, ""));
          }

          const removedScreenshots =
            oldIntegration.screenshots &&
            Array.isArray(oldIntegration.screenshots)
              ? oldIntegration.screenshots.filter(
                  (s) =>
                    typeof s === "string" &&
                    !integration.screenshots.includes(s),
                )
              : [];

          if (removedScreenshots.length > 0) {
            await deleteScreenshots(removedScreenshots);
          }
        })(),
      );
    } else {
      await prisma.integration.create({
        data: {
          ...integration,
          id: newIntegrationId,
          projectId: workspaceId,
          userId: ctx.user.id,
        },
      });
    }
    return { ok: true };
  });
