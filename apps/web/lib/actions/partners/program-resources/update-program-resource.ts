"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { storage } from "@/lib/storage";
import {
  programResourceColorSchema,
  programResourceFileSchema,
  programResourceLinkSchema,
  programResourcesSchema,
} from "@/lib/zod/schemas/program-resources";
import { prisma } from "@dub/prisma";
import { R2_URL } from "@dub/utils";
import * as z from "zod/v4";
import { authActionClient } from "../../safe-action";
import { throwIfNoPermission } from "../../throw-if-no-permission";

// Base schema for all resource types
const baseUpdateSchema = z.object({
  workspaceId: z.string(),
  resourceId: z.string(),
});

// Schema for logo resources
const updateLogoSchema = baseUpdateSchema.extend({
  resourceType: z.literal("logo"),
  name: z.string().min(1).optional(),
  url: z.url().optional(),
  fileSize: z.number().int().positive().optional(),
});

// Schema for file resources
const updateFileSchema = baseUpdateSchema.extend({
  resourceType: z.literal("file"),
  name: z.string().min(1).optional(),
  url: z.url().optional(),
  fileSize: z.number().int().positive().optional(),
});

// Schema for color resources
const updateColorSchema = baseUpdateSchema.extend({
  resourceType: z.literal("color"),
  name: z.string().min(1).optional(),
  color: z.string().optional(),
});

// Schema for link resources
const updateLinkSchema = baseUpdateSchema.extend({
  resourceType: z.literal("link"),
  name: z.string().min(1).optional(),
  url: z.url().optional(),
});

// Combined schema that can handle any resource type
const updateResourceSchema = z.discriminatedUnion("resourceType", [
  updateLogoSchema,
  updateFileSchema,
  updateColorSchema,
  updateLinkSchema,
]);

export const updateProgramResourceAction = authActionClient
  .inputSchema(updateResourceSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspace } = ctx;
    const { resourceId, resourceType } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    // Verify the program exists and belongs to the workspace
    const program = await prisma.program.findUnique({
      where: {
        id: programId,
        workspaceId: workspace.id,
      },
      select: {
        id: true,
        resources: true,
      },
    });

    if (!program) throw new Error("Program not found");
    if (!program.resources) throw new Error("Program resources not found");

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

    if (resourceType === "logo" || resourceType === "file") {
      const { name, url, fileSize } = parsedInput;

      const newUrl = url || existingResource.url;
      const newSize = fileSize ?? existingResource.size;

      // If a new URL was provided, delete the old file from storage (best-effort)
      if (url && existingResource.url && existingResource.url !== url) {
        try {
          await storage.delete({
            key: existingResource.url.replace(`${R2_URL}/`, ""),
          });
        } catch (error) {
          console.error(
            "Failed to delete old program resource file from storage:",
            error,
          );
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
        resources: programResourcesSchema.parse(updatedResources) as any,
      },
    });

    return {
      success: true,
    };
  });
