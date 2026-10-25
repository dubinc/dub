import { withWorkspace } from "@/lib/auth";
import { getWorkspaceUsage } from "@/lib/tinybird/get-workspace-usage";
import { usageQuerySchema } from "@/lib/zod/schemas/usage";
import { NextResponse } from "next/server";

export const GET = withWorkspace(
  async ({ searchParams, workspace }) => {
    const { resource, ...params } = usageQuerySchema.parse(searchParams);

    const data = await getWorkspaceUsage({
      workspaceId: workspace.id,
      resource,
      ...params,
    });

    return NextResponse.json(data);
  },
  {
    requiredPermissions: ["workspaces.read"],
  },
);
