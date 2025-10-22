"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { storage } from "@/lib/storage";
import { uploadedImageAllowSVGSchema } from "@/lib/zod/schemas/misc";
import { prisma } from "@dub/prisma";
import { R2_URL, nanoid } from "@dub/utils";
import slugify from "@sindresorhus/slugify";
import { z } from "zod";
import { authActionClient } from "../../safe-action";

// Base schema for all resource types
const baseResourceSchema = z.object({
  workspaceId: z.string(),
  resourceId: z.string(),
  name: z.string().min(1, "Name is required"),
});

// Schema for logo resources
const logoResourceSchema = baseResourceSchema.extend({
  resourceType: z.literal("logo"),
  file: uploadedImageAllowSVGSchema,
  extension: z.string().nullish(),
});

// Schema for file resources
const fileResourceSchema = baseResourceSchema.extend({
  resourceType: z.literal("file"),
  file: z.string(),
  extension: z.string().nullish(),
});

// Schema for color resources
const colorResourceSchema = baseResourceSchema.extend({
  resourceType: z.literal("color"),
  color: z.string(), // Hex color code
});

// Schema for link resources
const linkResourceSchema = baseResourceSchema.extend({
  resourceType: z.literal("link"),
  url: z.string().url(),
});

// Combined schema that can handle any resource type
const updateResourceSchema = z.discriminatedUnion("resourceType", [
  logoResourceSchema,
  fileResourceSchema,
  colorResourceSchema,
  linkResourceSchema,
]);

export const updateProgramResourceAction = authActionClient
  .schema(updateResourceSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspace } = ctx;
    const { resourceId, name, resourceType } = parsedInput;
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

    const currentResources = (program.resources as any) || {
      logos: [],
      colors: [],
      files: [],
      links: [],
    };

    const updatedResources = { ...currentResources };

    // Find the resource to update
    const resourceKey = `${resourceType}s`;
    const resourceArray = updatedResources[resourceKey] || [];
    const existingResource = resourceArray.find(
      (r: any) => r.id === resourceId,
    );

    if (!existingResource) throw new Error("Resource not found");

    if (resourceType === "logo" || resourceType === "file") {
      const { file, extension } = parsedInput;

      if (!file) {
        throw new Error("File is required.");
      }

      // Check if the file is already a stored URL (not base64)
      const isStoredUrl = file.startsWith("http");
      let fileUrl = file;

      if (!isStoredUrl) {
        // Upload the file to storage (following add flow pattern)
        const fileKey = `programs/${program.id}/${resourceType}s/${slugify(name || resourceType)}-${nanoid(4)}${extension ? `.${extension}` : ""}`;
        const uploadResult = await storage.upload(
          fileKey,
          file,
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
        );

        if (!uploadResult || !uploadResult.url) {
          throw new Error(`Failed to upload ${resourceType}`);
        }

        fileUrl = uploadResult.url;

        // Extract file size from base64 string
        const base64Data = file.replace(/^data:.+;base64,/, "");
        const fileSize = Math.ceil((base64Data.length * 3) / 4);

        if (fileSize / 1024 / 1024 > 10)
          throw new Error("File size is too large");

        // Delete old file if it exists and is different
        if (existingResource.url && existingResource.url !== fileUrl) {
          try {
            await storage.delete(
              existingResource.url.replace(`${R2_URL}/`, ""),
            );
          } catch (error) {
            console.error(
              "Failed to delete old program resource file from storage:",
              error,
            );
          }
        }

        const updatedResource = {
          ...existingResource,
          name,
          url: fileUrl,
          extension: extension || existingResource.extension,
          size: fileSize,
        };

        updatedResources[resourceKey] = resourceArray.map((r: any) =>
          r.id === resourceId ? updatedResource : r,
        );
      } else {
        // File is already a stored URL, just update the name
        const updatedResource = {
          ...existingResource,
          name,
          url: fileUrl,
          extension: extension || existingResource.extension,
          size: existingResource.size, // Keep existing size
        };

        updatedResources[resourceKey] = resourceArray.map((r: any) =>
          r.id === resourceId ? updatedResource : r,
        );
      }
    } else if (resourceType === "color") {
      const { color } = parsedInput;

      const updatedResource = {
        ...existingResource,
        name,
        color,
      };

      updatedResources[resourceKey] = resourceArray.map((r: any) =>
        r.id === resourceId ? updatedResource : r,
      );
    } else if (resourceType === "link") {
      const { url } = parsedInput;

      const updatedResource = {
        ...existingResource,
        name,
        url,
      };

      updatedResources[resourceKey] = resourceArray.map((r: any) =>
        r.id === resourceId ? updatedResource : r,
      );
    } else {
      throw new Error("Invalid resource type");
    }

    // Update the program with the updated resources
    await prisma.program.update({
      where: {
        id: program.id,
      },
      data: {
        resources: updatedResources,
      },
    });

    return {
      success: true,
    };
  });
