import { withAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { deleteProject } from "@/lib/api/project";
import { DEFAULT_REDIRECTS, validSlugRegex } from "@dub/utils";
import { isReservedKey } from "@/lib/edge-config";

// GET /api/projects/[slug] – get a specific project
export const GET = withAuth(async ({ project, headers }) => {
  return NextResponse.json(project, { headers });
});

// PUT /api/projects/[slug] – update a specific project
export const PUT = withAuth(
  async ({ req, project }) => {
    const { name, slug } = await req.json();

    // if slug is defined, do some checks
    if (slug) {
      // check if slug is too long
      if (slug.length > 48) {
        return new Response("Slug must be less than 48 characters", {
          status: 400,
        });

        // check if slug is valid
      } else if (!validSlugRegex.test(slug)) {
        return new Response("Invalid slug", { status: 400 });

        // check if slug is reserved
      } else if ((await isReservedKey(slug)) || DEFAULT_REDIRECTS[slug]) {
        return new Response("Cannot use reserved slugs", { status: 422 });
      }
    }

    try {
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
        return new Response("Project slug already exists.", { status: 422 });
      }
      return new Response(error.message, { status: 500 });
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
