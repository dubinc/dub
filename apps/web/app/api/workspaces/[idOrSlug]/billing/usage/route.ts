import { withWorkspace } from "@/lib/auth";
import { tb } from "@/lib/tinybird";
import z from "@/lib/zod";
import { usageQuerySchema, usageResponse } from "@/lib/zod/schemas/usage";
import { getFirstAndLastDay } from "@dub/utils";
import { NextResponse } from "next/server";

export const GET = withWorkspace(async ({ searchParams, workspace }) => {
  const { resource, timezone } = usageQuerySchema.parse(searchParams);
  const { billingCycleStart } = workspace;
  const { firstDay, lastDay } = getFirstAndLastDay(billingCycleStart);

  const pipe = tb.buildPipe({
    pipe: "v2_usage",
    // we extend this here since we don't need to include all the additional parameters
    // in the actual request query schema
    parameters: usageQuerySchema.extend({
      workspaceId: z
        .string()
        .optional()
        .transform((v) => {
          if (v && !v.startsWith("ws_")) {
            return `ws_${v}`;
          } else {
            return v;
          }
        }),
      start: z.string(),
      end: z.string(),
    }),
    data: usageResponse,
  });

  const response = await pipe({
    resource,
    workspaceId: workspace.id,
    start: firstDay.toISOString().replace("T", " ").replace("Z", ""),
    // get end of the day (11:59:59 PM)
    end: new Date(lastDay.getTime() + 86399999)
      .toISOString()
      .replace("T", " ")
      .replace("Z", ""),
    timezone,
  });

  return NextResponse.json(response.data);
});
