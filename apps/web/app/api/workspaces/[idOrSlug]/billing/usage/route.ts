import { prefixWorkspaceId } from "@/lib/api/workspace-id";
import { withWorkspace } from "@/lib/auth";
import { tb } from "@/lib/tinybird";
import z from "@/lib/zod";
import { usageQuerySchema, usageResponse } from "@/lib/zod/schemas/usage";
import { NextResponse } from "next/server";

export const GET = withWorkspace(async ({ searchParams, workspace }) => {
  const { resource, start, end, timezone } =
    usageQuerySchema.parse(searchParams);

  const pipe = tb.buildPipe({
    pipe: "v2_usage",
    // we extend this here since we don't need to include all the additional parameters
    // in the actual request query schema
    parameters: usageQuerySchema.extend({
      workspaceId: z
        .string()
        .optional()
        .transform((v) => (v ? prefixWorkspaceId(v) : undefined)),
      start: z.string(),
      end: z.string(),
    }),
    data: usageResponse,
  });

  const response = await pipe({
    resource,
    workspaceId: workspace.id,
    start,
    end,
    timezone,
  });

  return NextResponse.json(response.data);
});
