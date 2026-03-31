"use server";

import { createId } from "@/lib/api/create-id";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import {
  programResourceColorSchema,
  programResourceFileSchema,
  programResourceLinkSchema,
} from "@/lib/zod/schemas/program-resources";
import { prisma } from "@dub/prisma";
import { R2_URL } from "@dub/utils";
import * as z from "zod/v4";
import { authActionClient } from "../../safe-action";
import { throwIfNoPermission } from "../../throw-if-no-permission";
import { MAX_PROGRAM_RESOURCE_FILE_SIZE_BYTES } from "./constants";

// Base schema for all resource types
const baseResourceSchema = z.object({
  workspaceId: z.string(),
  name: z.string().min(1, "Name is required"),
});

// Schema for logo resources
const logoResourceSchema = baseResourceSchema.extend({
  resourceType: z.literal("logo"),
  key: z.string(),
  fileSize: z.number().int().positive(),
});

// Schema for file resources
const fileResourceSchema = baseResourceSchema.extend({
  resourceType: z.literal("file"),
  key: z.string(),
  fileSize: z.number().int().positive(),
});

// Schema for color resources
const colorResourceSchema = baseResourceSchema.extend({
  resourceType: z.literal("color"),
  color: z.string(), // Hex color code
});

// Schema for link resources
const linkResourceSchema = baseResourceSchema.extend({
  resourceType: z.literal("link"),
  url: z.url(),
});

// Combined schema that can handle any resource type
const addResourceSchema = z.discriminatedUnion("resourceType", [
  logoResourceSchema,
  fileResourceSchema,
  colorResourceSchema,
  linkResourceSchema,
]);

export const addProgramResourceAction = authActionClient
  .inputSchema(addResourceSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspace } = ctx;
    const { name, resourceType } = parsedInput;

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

    const currentResources = (program.resources as any) || {
      logos: [],
      colors: [],
      files: [],
      links: [],
    };

    const updatedResources = { ...currentResources };

    if (resourceType === "logo" || resourceType === "file") {
      const { key, fileSize } = parsedInput;

      if (!key.startsWith(`programs/${program.id}/`)) {
        throw new Error("Invalid resource key");
      }

      if (fileSize > MAX_PROGRAM_RESOURCE_FILE_SIZE_BYTES) {
        throw new Error(
          `File size exceeds the maximum allowed size of ${MAX_PROGRAM_RESOURCE_FILE_SIZE_BYTES / 1024 / 1024}MB`,
        );
      }

      const url = `${R2_URL}/${key}`;

      const newResource = programResourceFileSchema.parse({
        id: createId({ prefix: "pgr_" }),
        name,
        size: fileSize,
        url,
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
    } else if (resourceType === "link") {
      const { url } = parsedInput;

      const newResource = programResourceLinkSchema.parse({
        id: createId({ prefix: "pgr_" }),
        name,
        url,
      });

      updatedResources.links = [...(updatedResources.links || []), newResource];
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
