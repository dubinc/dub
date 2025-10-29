import { getLinksCount } from "@/lib/api/links";
import { validateLinksQueryFilters } from "@/lib/api/links/validate-links-query-filters";
import { withWorkspace } from "@/lib/auth";
import { getLinksCountQuerySchema } from "@/lib/zod/schemas/links";
import { NextResponse } from "next/server";

// GET /api/links/count – get the number of links for a workspace
export const GET = withWorkspace(
  async ({ headers, searchParams, workspace, session }) => {
    const filters = getLinksCountQuerySchema.parse(searchParams);

    const { folderIds } = await validateLinksQueryFilters({
      ...filters,
      workspace,
      userId: session.user.id,
    });

    const count = await getLinksCount({
      ...filters,
      workspaceId: workspace.id,
      folderIds,
    });

    return NextResponse.json(count, {
      headers,
    });
  },
  {
    requiredPermissions: ["links.read"],
  },
);
