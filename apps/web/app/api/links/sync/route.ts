import { exceededLimitError } from "@/lib/api/errors";
import { propagateBulkLinkChanges } from "@/lib/api/links/propagate-bulk-link-changes";
import { updateLinksUsage } from "@/lib/api/links/update-links-usage";
import { withWorkspace } from "@/lib/auth";
import { SimpleLinkProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// POST /api/links/sync – sync user's publicly created links to their accounts
export const POST = withWorkspace(
  async ({ req, session, workspace }) => {
    let links: SimpleLinkProps[] = [];
    try {
      links = await req.json();
      if (!Array.isArray(links)) {
        throw new Error("Invalid request body.");
      }
    } catch (e) {
      return new Response("Invalid request body.", { status: 400 });
    }

    const unclaimedLinks = await Promise.all(
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
    ).then((links) => links.filter((link) => link !== null));

    if (unclaimedLinks.length === 0) {
      return new Response("No links created.", { status: 200 });
    }

    if (workspace.linksUsage + unclaimedLinks.length > workspace.linksLimit) {
      return new Response(
        exceededLimitError({
          plan: workspace.plan,
          limit: workspace.linksLimit,
          type: "links",
        }),
        { status: 403 },
      );
    }

    const response = await Promise.allSettled([
      prisma.link.updateMany({
        where: {
          id: {
            in: unclaimedLinks.map((link) => link!.id),
          },
        },
        data: {
          userId: session.user.id,
          projectId: workspace.id,
          publicStats: false,
        },
      }),
      // remove shared dashboards
      prisma.dashboard.deleteMany({
        where: {
          linkId: { in: unclaimedLinks.map((link) => link!.id) },
        },
      }),
      propagateBulkLinkChanges(
        unclaimedLinks.map((link) => ({
          ...link!,
          userId: session.user.id,
          projectId: workspace.id,
          publicStats: false,
          tags: [],
        })),
      ),
      updateLinksUsage({
        workspaceId: workspace.id,
        increment: unclaimedLinks.length,
      }),
    ]);

    return NextResponse.json(response);
  },
  {
    requiredPermissions: ["links.write"],
  },
);
