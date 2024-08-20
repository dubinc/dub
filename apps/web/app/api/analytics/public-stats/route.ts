import { getDomainOrThrow } from "@/lib/api/domains/get-domain-or-throw";
import { withWorkspace } from "@/lib/auth";
import { getLinkViaEdge } from "@/lib/planetscale";
import { prisma } from "@/lib/prisma";
import z from "@/lib/zod";
import { domainKeySchema } from "@/lib/zod/schemas/links";
import { NextResponse } from "next/server";

const updatePublicStatsSchema = z.object({
  publicStats: z.boolean(),
});

// GET /api/analytics/public-stats – get the publicStats setting for a link
export const GET = withWorkspace(
  async ({ searchParams, workspace }) => {
    const { domain, key } = domainKeySchema.parse(searchParams);

    await getDomainOrThrow({
      workspace,
      domain,
    });

    const response = await getLinkViaEdge(domain, key);
    return NextResponse.json({ publicStats: response?.publicStats });
  },
  {
    requiredPermissions: ["links.read"],
  },
);

// PUT /api/analytics/public-stats – update the publicStats setting for a link
export const PUT = withWorkspace(
  async ({ req, searchParams, workspace }) => {
    const { domain, key } = domainKeySchema.parse(searchParams);
    const { publicStats } = updatePublicStatsSchema.parse(await req.json());

    await getDomainOrThrow({
      workspace,
      domain,
    });

    const response = await prisma.link.update({
      where: { domain_key: { domain, key } },
      data: { publicStats },
    });

    return NextResponse.json(response);
  },
  {
    requiredPermissions: ["links.write"],
  },
);
