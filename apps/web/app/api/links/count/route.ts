import { getLinksCount } from "@/lib/api/links";
import { withWorkspace } from "@/lib/auth";
import { getLinksCountQuerySchema } from "@/lib/zod/schemas/links";
import { NextResponse } from "next/server";

// GET /api/links/count – get the number of links for a workspace
export const GET = withWorkspace(
  async ({ headers, searchParams, workspace }) => {
    const { userId, ...params } = getLinksCountQuerySchema.parse(searchParams);

    const count = await getLinksCount({
      searchParams: params,
      workspaceId: workspace.id,
      userId,
    });

    return NextResponse.json(count, {
      headers,
    });
  },
  {
    requiredScopes: ["links.read", "links.write"],
  },
);
