import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getPayoutsTimeseries } from "@/lib/api/payouts/get-payouts-timeseries";
import { withWorkspace } from "@/lib/auth";
import { getWorkspaceUsage } from "@/lib/tinybird/get-workspace-usage";
import { usageQuerySchema } from "@/lib/zod/schemas/usage";
import { NextResponse } from "next/server";

export const GET = withWorkspace(
  async ({ searchParams, workspace }) => {
    const { resource, ...params } = usageQuerySchema.parse(searchParams);

    if (resource === "payouts") {
      const { startDate, endDate } = getStartEndDates({
        interval: params.interval,
        start: params.start,
        end: params.end,
        timezone: params.timezone,
      });

      const timeseries = await getPayoutsTimeseries({
        workspaceId: workspace.id,
        startDate,
        endDate,
        timezone: params.timezone,
      });

      return NextResponse.json(
        timeseries.map(({ start, payouts }) => ({
          date: start,
          value: payouts,
          groups: [],
        })),
      );
    }

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
