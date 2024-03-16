import { DubApiError } from "@/lib/api/errors";
import { withAuth } from "@/lib/auth/utils";
import jackson from "@/lib/jackson";
import z from "@/lib/zod";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const createDirectorySchema = z.object({
  provider: z.enum(["okta-scim-v2", "azure-scim-v2", "google"]).optional(),
  currentDirectoryId: z.string().min(1).optional(),
});

const deleteDirectorySchema = z.object({
  directoryId: z.string().min(1),
});

// GET /api/projects/[slug]/scim – get all SCIM directories
export const GET = withAuth(async ({ project }) => {
  const { directorySyncController } = await jackson();

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
});

// POST /api/projects/[slug]/scim – create a new SCIM directory
export const POST = withAuth(
  async ({ req, project }) => {
    const { provider = "okta-scim-v2", currentDirectoryId } =
      createDirectorySchema.parse(await req.json());

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
  },
  {
    requiredRole: ["owner"],
    requiredPlan: ["enterprise"],
  },
);

// DELETE /api/projects/[slug]/scim – delete a SCIM directory

export const DELETE = withAuth(
  async ({ searchParams }) => {
    const { directoryId } = deleteDirectorySchema.parse(searchParams);

    const { directorySyncController } = await jackson();

    const { error, data } =
      await directorySyncController.directories.delete(directoryId);

    if (error) {
      throw new DubApiError({
        code: "bad_request",
        message: error.message,
      });
    }

    return NextResponse.json(data);
  },
  {
    requiredRole: ["owner"],
  },
);
