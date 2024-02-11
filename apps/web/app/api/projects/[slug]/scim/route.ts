import { withAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import jackson from "@/lib/jackson";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/errors";
import z from "@/lib/zod";

const createOrUpdateDirectorySchema = z.object({
  provider: z.enum(["okta-scim-v2", "azure-scim-v2", "google"]).optional(),
  currentDirectoryId: z.string().min(1).optional(),
});

const deleteDirectorySchema = z.object({
  directoryId: z.string().min(1),
});

// GET /api/projects/[slug]/scim – get all SCIM directories
export const GET = withAuth(async ({ project }) => {
  const { directorySyncController } = await jackson();

  try {
    const { data, error } =
      await directorySyncController.directories.getByTenantAndProduct(
        project.id,
        "Dub",
      );
    if (error) {
      throw new DubApiError({
        code: "internal_server_error",
        message: error.message,
      });
    }

    return NextResponse.json({
      directories: data,
    });
  } catch (err) {
    return handleAndReturnErrorResponse(err);
  }
});

// POST /api/projects/[slug]/scim – create a new SCIM directory
export const POST = withAuth(
  async ({ req, project }) => {
    try {
      const { provider = "okta-scim-v2", currentDirectoryId } =
        createOrUpdateDirectorySchema.parse(await req.json());

      const { directorySyncController } = await jackson();

      const [data, _] = await Promise.all([
        directorySyncController.directories.create({
          name: "Dub SCIM Directory",
          tenant: project.id,
          product: "Dub",
          type: provider,
        }),
        currentDirectoryId &&
          directorySyncController.directories.delete(currentDirectoryId),
      ]);

      return NextResponse.json(data);
    } catch (err) {
      return handleAndReturnErrorResponse(err);
    }
  },
  {
    requiredRole: ["owner"],
    requiredPlan: ["enterprise"],
  },
);

// DELETE /api/projects/[slug]/scim – delete a SCIM directory

export const DELETE = withAuth(
  async ({ searchParams }) => {
    try {
      const { directoryId } = deleteDirectorySchema.parse(searchParams);

      const { directorySyncController } = await jackson();

      const { error, data } = await directorySyncController.directories.delete(
        directoryId,
      );

      if (error) {
        throw new DubApiError({
          code: "bad_request",
          message: error.message,
        });
      }

      return NextResponse.json(data);
    } catch (err) {
      return handleAndReturnErrorResponse(err);
    }
  },
  {
    requiredRole: ["owner"],
  },
);
