import { DubApiError } from "@/lib/api/errors";
import { deleteWorkspace } from "@/lib/api/workspaces";
import { withAuth } from "@/lib/auth";
import { isReservedKey } from "@/lib/edge-config";
import prisma from "@/lib/prisma";
import z from "@/lib/zod";
import { DEFAULT_REDIRECTS, validSlugRegex } from "@dub/utils";
import slugify from "@sindresorhus/slugify";
import { NextResponse } from "next/server";

const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(32).optional(),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(48, "Slug must be less than 48 characters")
    .transform((v) => slugify(v))
    .refine((v) => validSlugRegex.test(v), { message: "Invalid slug format" })
    .refine(async (v) => !((await isReservedKey(v)) || DEFAULT_REDIRECTS[v]), {
      message: "Cannot use reserved slugs",
    })
    .optional(),
});

// GET /api/workspaces/[idOrSlug] – get a specific workspace by id or slug
export const GET = withAuth(async ({ workspace, headers }) => {
  return NextResponse.json(
    {
      ...workspace,
      id: `ws_${workspace.id}`,
    },
    { headers },
  );
});

// PUT /api/workspaces/[idOrSlug] – update a specific workspace by id or slug
export const PUT = withAuth(
  async ({ req, workspace }) => {
    try {
      const { name, slug } = await updateWorkspaceSchema.parseAsync(
        await req.json(),
      );

      const response = await prisma.project.update({
        where: {
          slug: workspace.slug,
        },
        data: {
          ...(name && { name }),
          ...(slug && { slug }),
        },
      });
      return NextResponse.json(response);
    } catch (error) {
      if (error.code === "P2002") {
        throw new DubApiError({
          code: "conflict",
          message: "Workspace slug already exists.",
        });
      }

      throw error;
    }
  },
  {
    requiredRole: ["owner"],
  },
);

// DELETE /api/workspaces/[idOrSlug] – delete a specific project
export const DELETE = withAuth(
  async ({ workspace }) => {
    const response = await deleteWorkspace(workspace);
    return NextResponse.json(response);
  },
  {
    requiredRole: ["owner"],
  },
);
