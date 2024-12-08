"use server";

import { prisma } from "@dub/prisma";
import { DUB_WORKSPACE_ID, nanoid, R2_URL } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
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
  .action(async ({ parsedInput }) => {
    const { id, workspaceId, ...integration } = parsedInput;

    // this is only available for Dub workspace for now
    // we might open this up to other workspaces in the future
    if (workspaceId !== DUB_WORKSPACE_ID) {
      throw new Error("Not authorized");
    }

    if (integration.logo && !isStored(integration.logo)) {
      const result = await storage.upload(
        `integrations/${id}_${nanoid(7)}`,
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
          const logoUpdated = integration.logo !== oldIntegration.logo;
          if (
            logoUpdated &&
            integration.logo &&
            integration.logo.startsWith(`${R2_URL}/integrations/${id}`)
          ) {
            await storage.delete(integration.logo.replace(`${R2_URL}/`, ""));
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
          projectId: workspaceId,
        },
      });
    }
    return { ok: true };
  });
