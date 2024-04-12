import { getLinksCount } from "@/lib/api/links";
import { withAuth } from "@/lib/auth";
import { getLinksCountQuerySchema } from "@/lib/zod/schemas";
import { getSearchParamsWithArray } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/links/count – get the number of links for a workspace
export const GET = withAuth(async ({ req, headers, workspace }) => {
  const searchParams = getSearchParamsWithArray(req.url);
  const { userId, ...params } = getLinksCountQuerySchema.parse(searchParams);

  const count = await getLinksCount({
    searchParams: params,
    workspaceId: workspace.id,
    userId,
  });

  return NextResponse.json(count, {
    headers,
  });
});
