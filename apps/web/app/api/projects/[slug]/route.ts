import { DubApiError } from "@/lib/api/errors";
import { deleteProject } from "@/lib/api/projects";
import { withAuth } from "@/lib/auth/utils";
import { isReservedKey } from "@/lib/edge-config";
import prisma from "@/lib/prisma";
import z from "@/lib/zod";
import { DEFAULT_REDIRECTS, validSlugRegex } from "@dub/utils";
import slugify from "@sindresorhus/slugify";
import { NextResponse } from "next/server";

const updateProjectSchema = z.object({
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

// GET /api/projects/[slug] – get a specific project
export const GET = withAuth(async ({ project, headers }) => {
  return NextResponse.json(project, { headers });
});

// PUT /api/projects/[slug] – update a specific project
export const PUT = withAuth(
  async ({ req, project }) => {
    try {
      const { name, slug } = await updateProjectSchema.parseAsync(
        await req.json(),
      );

      const response = await prisma.project.update({
        where: {
          slug: project.slug,
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
          message: "Project slug already exists.",
        });
      }

      throw error;
    }
  },
  {
    requiredRole: ["owner"],
  },
);

// DELETE /api/projects/[slug] – delete a specific project
export const DELETE = withAuth(
  async ({ project }) => {
    const response = await deleteProject(project);
    return NextResponse.json(response);
  },
  {
    requiredRole: ["owner"],
  },
);
