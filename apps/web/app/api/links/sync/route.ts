import { propagateBulkLinkChanges } from "@/lib/api/links/propagate-bulk-link-changes";
import { withWorkspace } from "@/lib/auth";
import { exceededLimitError } from "@/lib/exceeded-limit-error";
import { prisma } from "@/lib/prisma";
import { SimpleLinkProps } from "@/lib/types";
import { publishWorkspaceLinksUsageEvent } from "@/lib/upstash/redis-streams/workspace-links-usage";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const syncLinksSchema = z.array(
  z.object({
    domain: z.string().min(1),
    key: z.string().min(1),
  }),
);

// POST /api/links/sync – sync user's publicly created links to their accounts
export const POST = withWorkspace(
  async ({ req, session, workspace }) => {
    // The body comes from the hashes__dub cookie, so its shape is not guaranteed
    let links: Pick<SimpleLinkProps, "domain" | "key">[] = [];
    try {
      links = syncLinksSchema.parse(await req.json());
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
            projectId: null,
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
          planPeriod: workspace.planPeriod,
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
      propagateBulkLinkChanges({
        links: unclaimedLinks.map((link) => ({
          ...link!,
          userId: session.user.id,
          projectId: workspace.id,
          publicStats: false,
          tags: [],
        })),
      }),
      publishWorkspaceLinksUsageEvent({
        workspaceId: workspace.id,
        linksCount: unclaimedLinks.length,
        timestamp: new Date().toISOString(),
      }),
    ]);

    return NextResponse.json(response);
  },
  {
    requiredPermissions: ["links.write"],
  },
);
