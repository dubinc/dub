import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import jackson from "@/lib/jackson";
import z from "@/lib/zod";
import { NextResponse } from "next/server";

const createDirectorySchema = z.object({
  provider: z.enum(["okta-scim-v2", "azure-scim-v2", "google"]).optional(),
  currentDirectoryId: z.string().min(1).optional(),
});

const deleteDirectorySchema = z.object({
  directoryId: z.string().min(1),
});

// GET /api/workspaces/[idOrSlug]/scim – get all SCIM directories
export const GET = withWorkspace(
  async ({ workspace }) => {
    const { directorySyncController } = await jackson();

    const { data, error } =
      await directorySyncController.directories.getByTenantAndProduct(
        workspace.id,
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
  },
  {
    requiredScopes: ["workspaces.read", "workspaces.write"],
  },
);

// POST /api/workspaces/[idOrSlug]/scim – create a new SCIM directory
export const POST = withWorkspace(
  async ({ req, workspace }) => {
    const { provider = "okta-scim-v2", currentDirectoryId } =
      createDirectorySchema.parse(await req.json());

    const { directorySyncController } = await jackson();

    const [data, _] = await Promise.all([
      directorySyncController.directories.create({
        name: "Dub SCIM Directory",
        tenant: workspace.id,
        product: "Dub",
        type: provider,
      }),
      currentDirectoryId &&
        directorySyncController.directories.delete(currentDirectoryId),
    ]);

    return NextResponse.json(data);
  },
  {
    requiredScopes: ["workspaces.write"],
    requiredPlan: ["enterprise"],
  },
);

// DELETE /api/workspaces/[idOrSlug]/scim – delete a SCIM directory
export const DELETE = withWorkspace(
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
    requiredScopes: ["workspaces.write"],
  },
);
