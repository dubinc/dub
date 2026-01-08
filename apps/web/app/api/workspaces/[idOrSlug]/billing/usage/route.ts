import { formatUTCDateTimeClickhouse } from "@/lib/analytics/utils/format-utc-datetime-clickhouse";
import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { withWorkspace } from "@/lib/auth";
import { tb } from "@/lib/tinybird";
import { usageQuerySchema, usageResponse } from "@/lib/zod/schemas/usage";
import { prisma } from "@dub/prisma";
import { subYears } from "date-fns";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

export const GET = withWorkspace(async ({ searchParams, workspace }) => {
  const {
    resource,
    folderId,
    domain,
    groupBy,
    interval,
    start,
    end,
    timezone,
  } = usageQuerySchema.parse(searchParams);

  const pipe = tb.buildPipe({
    pipe: "v3_usage",
    // we extend this here since we don't need to include all the additional parameters
    // in the actual request query schema
    parameters: usageQuerySchema.extend({
      workspaceId: z.string(),
    }),
    data: usageResponse,
  });

  const { startDate, endDate } = getStartEndDates({
    interval,
    start,
    end,
    dataAvailableFrom: subYears(new Date(), 1),
    timezone,
  });

  const response = await pipe({
    resource,
    workspaceId: workspace.id,
    start: formatUTCDateTimeClickhouse(startDate),
    end: formatUTCDateTimeClickhouse(endDate),
    timezone,
    ...(folderId && { folderId }),
    ...(domain && { domain }),
    ...(groupBy && { groupBy }),
  });

  let data = response.data;

  if (groupBy) {
    const dates = [...new Set(response.data.map((d) => d.date))];
    const groupIds = [...new Set(response.data.map((d) => d[groupBy] ?? ""))];

    const where = {
      projectId: workspace.id,
      id: {
        in: groupIds,
      },
    };

    const groupMeta = await (groupBy === "folder_id"
      ? prisma.folder.findMany({
          select: {
            id: true,
            name: true,
          },
          where,
        })
      : prisma.domain.findMany({
          select: {
            id: true,
            slug: true,
          },
          where,
        }));

    data = dates.map((date) => {
      const groups = groupIds.map((groupId) => ({
        id: groupId,
        name:
          groupMeta.find((g) => g.id === groupId)?.[
            groupBy === "folder_id" ? "name" : "slug"
          ] ?? groupId,
        usage: sum(
          response.data
            .filter((d) => d.date === date && d[groupBy] === groupId)
            .map((d) => d.value),
        ),
      }));

      return {
        date,
        value: sum(groups.map((g) => g.usage)),
        groups,
      };
    });
  }

  return NextResponse.json(data);
});

const sum = (arr: number[]) => arr.reduce((acc, curr) => acc + curr, 0);
