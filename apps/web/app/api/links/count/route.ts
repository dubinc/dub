import { getLinksCount } from "@/lib/api/links";
import { withAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

// GET /api/links/count – get the number of links for a project
export const GET = withAuth(async ({ headers, searchParams, project }) => {
  const { userId } = searchParams;
  const count = await getLinksCount({
    searchParams,
    projectId: project.id,
    userId,
  });
  return NextResponse.json(count, {
    headers,
  });
});
