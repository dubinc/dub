import { deleteProject } from "@/lib/api/projects";
import { withAuth } from "@/lib/auth";
import { isReservedKey } from "@/lib/edge-config";
import { ErrorResponse, handleAndReturnErrorResponse } from "@/lib/api/errors";
import prisma from "@/lib/prisma";
import z from "@/lib/zod";
import { DEFAULT_REDIRECTS, validSlugRegex } from "@dub/utils";
import { NextResponse } from "next/server";

const updateProjectSchema = z.object({
  name: z.string().max(32).optional(),
  slug: z
    .string()
    .max(48, { message: "Slug must be less than 48 characters" })
    .regex(validSlugRegex, { message: "Invalid slug" })
    .refine(
      async (slug) => {
        if ((await isReservedKey(slug)) || DEFAULT_REDIRECTS[slug]) {
          return false;
        }

        return true;
      },
      { message: "Cannot use reserved slugs" },
    )
    .optional(),
  defaultDomains: z.array(z.string()).optional(),
});

// GET /api/projects/[slug] – get a specific project
export const GET = withAuth(async ({ project, headers }) => {
  return NextResponse.json(project, { headers });
});

// PUT /api/projects/[slug] – update a specific project
export const PUT = withAuth(
  async ({ req, project }) => {
    try {
      const { name, slug, defaultDomains } =
        await updateProjectSchema.parseAsync(await req.json());

      const response = await prisma.project.update({
        where: {
          slug: project.slug,
        },
        data: {
          ...(name && { name }),
          ...(slug && { slug }),
          ...(defaultDomains && {
            metadata: {
              ...project.metadata,
              defaultDomains,
            },
          }),
        },
      });
      return NextResponse.json(response);
    } catch (error) {
      if (error.code === "P2002") {
        return NextResponse.json<ErrorResponse>(
          {
            error: {
              code: "conflict",
              message: "Project slug already exists.",
            },
          },
          { status: 422 },
        );
      }
      return handleAndReturnErrorResponse(error);
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
