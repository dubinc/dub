import { getLinksCount } from "@/lib/api/links";
import { withAuth } from "@/lib/auth";
import { DUB_PROJECT_ID } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/links/count – get the number of links for a project
export const GET = withAuth(
  async ({ headers, searchParams, project, session }) => {
    const { userId } = searchParams;
    const count = await getLinksCount({
      searchParams,
      projectId: project?.id || DUB_PROJECT_ID,
      userId: project?.id ? userId : session.user.id,
    });
    return NextResponse.json(count, {
      headers,
    });
  },
);
