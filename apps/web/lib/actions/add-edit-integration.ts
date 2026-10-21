"use server";

import { prisma } from "@/lib/prisma";
import { DUB_WORKSPACE_ID } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { createId } from "../api/create-id";
import { deleteScreenshots } from "../integrations/utils";
import { storage } from "../storage";
import { getOwnedAssetKey, resolveIncomingImage } from "../storage/asset-keys";
import { createIntegrationSchema } from "../zod/schemas/integration";
import { authActionClient } from "./safe-action";
import { throwIfNoPermission } from "./throw-if-no-permission";

export const addEditIntegration = authActionClient
  .inputSchema(
    createIntegrationSchema.extend({
      id: z.string().optional(), // if id is provided, we are editing the integration
      workspaceId: z.string(),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const { id, workspaceId, ...integration } = parsedInput;
    const { workspace } = ctx;

    throwIfNoPermission({
      role: workspace.role,
      requiredPermissions: ["oauth_apps.write"],
    });

    // this is only available for Dub workspace for now
    // we might open this up to other workspaces in the future
    if (workspaceId !== DUB_WORKSPACE_ID) {
      throw new Error("Not authorized");
    }

    const newIntegrationId = createId({ prefix: "int_" });
    const integrationId = id || newIntegrationId;

    const oldIntegration = id
      ? await prisma.integration.findUniqueOrThrow({
          where: {
            id,
          },
        })
      : null;

    const { url: logoUrl, uploadKey: logoUploadKey } = resolveIncomingImage({
      kind: "integrationLogo",
      ownerId: integrationId,
      value: integration.logo,
      current: oldIntegration?.logo,
    });

    if (integration.logo && logoUploadKey) {
      await storage.upload({
        key: logoUploadKey,
        body: integration.logo,
      });
    }

    integration.logo = logoUrl;

    if (id && oldIntegration) {
      await prisma.integration.update({
        where: { id },
        data: integration,
      });

      waitUntil(
        (async () => {
          // Only when the logo was replaced or cleared
          const oldLogoKey =
            logoUploadKey || integration.logo === null
              ? getOwnedAssetKey({
                  kind: "integrationLogo",
                  ownerId: id,
                  url: oldIntegration.logo,
                })
              : null;

          if (oldLogoKey) {
            await storage.delete({
              key: oldLogoKey,
            });
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
            await deleteScreenshots({
              screenshots: removedScreenshots,
              workspaceId: oldIntegration.projectId,
            });
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
