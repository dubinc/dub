"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { storage } from "@/lib/storage";
import { uploadedImageAllowSVGSchema } from "@/lib/zod/schemas/misc";
import {
  programResourceColorSchema,
  programResourceFileSchema,
  programResourceLinkSchema,
  programResourcesSchema,
} from "@/lib/zod/schemas/program-resources";
import { prisma } from "@dub/prisma";
import { nanoid, R2_URL } from "@dub/utils";
import slugify from "@sindresorhus/slugify";
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
  file: uploadedImageAllowSVGSchema.optional(),
  extension: z.string().nullish(),
});

// Schema for file resources
const updateFileSchema = baseUpdateSchema.extend({
  resourceType: z.literal("file"),
  name: z.string().min(1).optional(),
  file: z.string().optional(),
  extension: z.string().nullish(),
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
      const { name, file, extension } = parsedInput;

      let newUrl = existingResource.url;
      let newSize = existingResource.size;

      // If a new file is provided, upload it and delete the old one
      if (file) {
        // Validate file size before upload
        const base64Data = file.replace(/^data:.+;base64,/, "");
        const fileSize = Math.ceil((base64Data.length * 3) / 4);

        if (fileSize / 1024 / 1024 > 10) {
          throw new Error("File size is too large");
        }

        // Upload the new file
        const fileName = name || existingResource.name;
        const fileKey = `programs/${program.id}/${resourceType}s/${slugify(fileName || resourceType)}-${nanoid(4)}${extension ? `.${extension}` : ""}`;
        const uploadResult = await storage.upload({
          key: fileKey,
          body: file,
          opts:
            resourceType === "logo"
              ? {
                  headers: {
                    "Content-Disposition": "attachment",
                    ...(extension === "svg" && {
                      "Content-Type": "image/svg+xml",
                    }),
                  },
                }
              : undefined,
        });

        if (!uploadResult || !uploadResult.url) {
          throw new Error(`Failed to upload ${resourceType}`);
        }

        newUrl = uploadResult.url;
        newSize = fileSize;

        // Delete old file from storage (best-effort, after successful upload)
        if (existingResource.url) {
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
