import { withAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { LinkProps, SimpleLinkProps } from "@/lib/types";
import { exceededLimitError } from "@/lib/api/errors";
import { bulkCreateLinks } from "@/lib/api/links";

// POST /api/links/sync – sync user's publicly created links to their accounts
export const POST = withAuth(async ({ req, session, project }) => {
  let links: SimpleLinkProps[] = [];
  try {
    links = await req.json();
    if (!Array.isArray(links)) {
      throw new Error("Invalid request body.");
    }
  } catch (e) {
    return new Response("Invalid request body.", { status: 400 });
  }

  const unclaimedLinks = (await Promise.all(
    links.map(async (link) => {
      return await prisma.link.findUnique({
        where: {
          domain_key: {
            domain: link.domain,
            key: link.key,
          },
          userId: null,
        },
      });
    }),
  )) as LinkProps[];

  if (unclaimedLinks.length === 0) {
    return new Response("No links created.", { status: 400 });
  }

  if (project.linksUsage + unclaimedLinks.length > project.linksLimit) {
    return new Response(
      exceededLimitError({
        plan: project.plan,
        limit: project.linksLimit,
        type: "links",
      }),
      { status: 403 },
    );
  }

  const response = await Promise.all([
    prisma.link.updateMany({
      where: {
        id: {
          in: unclaimedLinks.map((link) => link.id),
        },
      },
      data: {
        userId: session.user.id,
        projectId: project.id,
        publicStats: false,
      },
    }),
    bulkCreateLinks(unclaimedLinks),
    prisma.project.update({
      where: {
        id: project.id,
      },
      data: {
        // TODO: sync clicks usage as well
        linksUsage: {
          increment: unclaimedLinks.length,
        },
      },
    }),
  ]);

  return NextResponse.json(response);
});
