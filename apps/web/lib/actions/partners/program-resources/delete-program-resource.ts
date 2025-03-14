"use server";

import { storage } from "@/lib/storage";
import {
  PROGRAM_RESOURCE_TYPES,
  programResourcesSchema,
} from "@/lib/zod/schemas/program-resources";
import { prisma } from "@dub/prisma";
import { R2_URL } from "@dub/utils";
import { z } from "zod";
import { authActionClient } from "../../safe-action";

// Schema for deleting a program resource
const deleteProgramResourceSchema = z.object({
  workspaceId: z.string(),
  programId: z.string(),
  resourceType: z.enum(PROGRAM_RESOURCE_TYPES),
  resourceId: z.string(),
});

export const deleteProgramResourceAction = authActionClient
  .schema(deleteProgramResourceSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspace } = ctx;
    const { programId, resourceType, resourceId } = parsedInput;

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

    // Create a copy of the current resources to update
    const updatedResources = { ...(program.resources as any) };

    // Find the resource to delete
    const resourceKey = `${resourceType}s`;
    const resourceArray = updatedResources[resourceKey] || [];
    const resource = resourceArray.find(({ id }) => id === resourceId);

    if (!resource) throw new Error(`Resource not found`);

    // Delete file-based resources from storage
    if ((resourceType === "logo" || resourceType === "file") && resource.url) {
      try {
        await storage.delete(resource.url.replace(`${R2_URL}/`, ""));
      } catch (error) {
        console.error(
          "Failed to delete program resource file from storage:",
          error,
        );
      }
    }

    // Remove the resource from the array
    updatedResources[resourceKey] = resourceArray.filter(
      ({ id }) => id !== resourceId,
    );

    await prisma.program.update({
      where: {
        id: programId,
      },
      data: {
        resources: programResourcesSchema.parse(updatedResources) as any,
      },
    });

    return {
      success: true,
    };
  });
