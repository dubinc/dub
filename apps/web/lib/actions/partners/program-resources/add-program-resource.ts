"use server";

import { createId } from "@/lib/api/create-id";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { storage } from "@/lib/storage";
import { uploadedImageAllowSVGSchema } from "@/lib/zod/schemas/misc";
import {
  programResourceColorSchema,
  programResourceFileSchema,
} from "@/lib/zod/schemas/program-resources";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import slugify from "@sindresorhus/slugify";
import { z } from "zod";
import { authActionClient } from "../../safe-action";

// Base schema for all resource types
const baseResourceSchema = z.object({
  workspaceId: z.string(),
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

// Combined schema that can handle any resource type
const addResourceSchema = z.discriminatedUnion("resourceType", [
  logoResourceSchema,
  fileResourceSchema,
  colorResourceSchema,
]);

export const addProgramResourceAction = authActionClient
  .schema(addResourceSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspace } = ctx;
    const { name, resourceType } = parsedInput;
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
    };

    const updatedResources = { ...currentResources };

    if (resourceType === "logo" || resourceType === "file") {
      const { file, extension } = parsedInput;

      if (!file) {
        throw new Error("File is required.");
      }

      // Upload the file to storage
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

      // Extract file size from base64 string
      const base64Data = file.replace(/^data:.+;base64,/, "");
      const fileSize = Math.ceil((base64Data.length * 3) / 4);

      if (fileSize / 1024 / 1024 > 10)
        throw new Error("File size is too large");

      const newResource = programResourceFileSchema.parse({
        id: createId({ prefix: "pgr_" }),
        name,
        size: fileSize,
        url: uploadResult.url,
      });

      // Update the appropriate array in the resources object
      const resourceKey = resourceType === "logo" ? "logos" : "files";
      updatedResources[resourceKey] = [
        ...(updatedResources[resourceKey] || []),
        newResource,
      ];
    } else if (resourceType === "color") {
      const { color } = parsedInput;

      const newResource = programResourceColorSchema.parse({
        id: createId({ prefix: "pgr_" }),
        name,
        color,
      });

      updatedResources.colors = [
        ...(updatedResources.colors || []),
        newResource,
      ];
    } else {
      throw new Error("Invalid resource type");
    }

    // Update the program with the new resources
    await prisma.program.update({
      where: {
        id: program.id,
      },
      data: {
        resources: updatedResources,
      },
    });
  });
