import { withAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { LinkProps, SimpleLinkProps } from "@/lib/types";

// POST /api/links/sync – sync user's publicly created links to their accounts
export const POST = withAuth(
  async ({ req, session }) => {
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
          },
        });
      }),
    ).then((links) =>
      links.filter((link) => link && !link.userId),
    )) as LinkProps[];

    if (unclaimedLinks.length === 0) {
      return new Response("No links created.", { status: 400 });
    }

    const response = await prisma.link.updateMany({
      where: {
        id: {
          in: unclaimedLinks.map((link) => link.id),
        },
      },
      data: {
        userId: session.user.id,
        publicStats: false,
      },
    });

    return NextResponse.json(response);
  },
  {
    requiredPlan: ["pro", "enterprise"],
  },
);
