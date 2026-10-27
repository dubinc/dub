"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import {
  programResourceColorSchema,
  programResourceFileSchema,
  programResourceLinkSchema,
  programResourcesSchema,
  updateProgramResourceSchema,
} from "@/lib/zod/schemas/program-resources";
import { R2_URL } from "@dub/utils";
import { authActionClient } from "../../safe-action";
import { throwIfNoPermission } from "../../throw-if-no-permission";
import { MAX_PROGRAM_RESOURCE_FILE_SIZE_BYTES } from "./constants";

export const updateProgramResourceAction = authActionClient
  .inputSchema(updateProgramResourceSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspace } = ctx;
    const { resourceId, resourceType } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    const program = await prisma.program.findUniqueOrThrow({
      where: {
        id: programId,
      },
      select: {
        id: true,
        resources: true,
      },
    });

    if (!program.resources) {
      throw new Error("Program resources not found.");
    }

    const currentResources = program.resources as any;
    const updatedResources = { ...currentResources };

    // Find the resource to update
    const resourceKey = `${resourceType}s`;
    const resourceArray = [...(updatedResources[resourceKey] || [])];
    const resourceIndex = resourceArray.findIndex(
      ({ id }) => id === resourceId,
    );

    if (resourceIndex === -1) throw new Error("Resource not found");

    const existingResource = resourceArray[resourceIndex];

    // Capture old URL before any mutation so we can delete it after a successful DB write
    let oldFileUrl: string | null = null;

    if (resourceType === "logo" || resourceType === "file") {
      const { name, key, fileSize } = parsedInput;

      let newUrl = existingResource.url;
      let newSize = existingResource.size;

      // If a new file was uploaded, validate ownership and derive URL server-side
      if (key) {
        if (!key.startsWith(`programs/${program.id}/`)) {
          throw new Error("Invalid resource key");
        }

        if (fileSize && fileSize > MAX_PROGRAM_RESOURCE_FILE_SIZE_BYTES) {
          throw new Error(
            `File size exceeds the maximum allowed size of ${MAX_PROGRAM_RESOURCE_FILE_SIZE_BYTES / 1024 / 1024}MB`,
          );
        }

        newUrl = `${R2_URL}/${key}`;
        newSize = fileSize ?? existingResource.size;

        // Remember the old URL — we'll delete it after the DB update succeeds
        if (existingResource.url) {
          oldFileUrl = existingResource.url;
        }
      }

      const updatedResource = programResourceFileSchema.parse({
        id: resourceId,
        name: name || existingResource.name,
        size: newSize,
        url: newUrl,
      });

      resourceArray[resourceIndex] = updatedResource;
    } else if (resourceType === "color") {
      const { name, color } = parsedInput;

      const updatedResource = programResourceColorSchema.parse({
        id: resourceId,
        name: name || existingResource.name,
        color: color || existingResource.color,
      });

      resourceArray[resourceIndex] = updatedResource;
    } else if (resourceType === "link") {
      const { name, url } = parsedInput;

      const updatedResource = programResourceLinkSchema.parse({
        id: resourceId,
        name: name || existingResource.name,
        url: url || existingResource.url,
      });

      resourceArray[resourceIndex] = updatedResource;
    } else {
      throw new Error("Invalid resource type");
    }

    updatedResources[resourceKey] = resourceArray;

    // Update the program with the updated resources
    await prisma.program.update({
      where: {
        id: program.id,
      },
      data: {
        resources: programResourcesSchema.parse(updatedResources),
      },
    });

    // Delete the old file from storage only after the DB update succeeds (best-effort)
    if (oldFileUrl) {
      try {
        await storage.delete({
          key: oldFileUrl.replace(`${R2_URL}/`, ""),
        });
      } catch (error) {
        console.error(
          "Failed to delete old program resource file from storage:",
          error,
        );
      }
    }
  });
