"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { CampaignSummary } from "@/lib/types";
import { campaignSummarySchema } from "@/lib/zod/schemas/campaigns";
import { EnvelopeBan, EnvelopeCheck, EnvelopeOpen } from "@dub/ui";
import { fetcher, nFormatter } from "@dub/utils";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import useSWR from "swr";
import * as z from "zod/v4";

export function CampaignMetrics() {
  const { id: workspaceId } = useWorkspace();
  const { campaignId } = useParams<{ campaignId: string }>();

  const {
    data: summary,
    error,
    isLoading,
  } = useSWR<z.infer<typeof campaignSummarySchema>>(
    campaignId && workspaceId
      ? `/api/campaigns/${campaignId}/summary?workspaceId=${workspaceId}`
      : null,
    fetcher,
  );

  const metrics = useMemo(() => {
    if (!summary) return [];

    const { deliveredPercentage, bouncedPercentage, openedPercentage } =
      calculateCampaignPercentages(summary);

    return [
      {
        icon: EnvelopeCheck,
        label: "Delivered",
        percentage: `${deliveredPercentage}%`,
        count: nFormatter(summary.delivered),
      },
      {
        icon: EnvelopeBan,
        label: "Bounced",
        percentage: `${bouncedPercentage}%`,
        count: nFormatter(summary.bounced),
      },
      {
        icon: EnvelopeOpen,
        label: "Opened",
        percentage: `${openedPercentage}%`,
        count: nFormatter(summary.opened),
      },
    ];
  }, [summary]);

  return (
    <div>
      {error ? (
        <div className="flex h-full items-center justify-center">
          <p className="text-content-subtle text-sm">Failed to load metrics</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200">
          {isLoading ? (
            <CampaignMetricsLoadingSkeleton />
          ) : (
            metrics.map((metric) => (
              <div key={metric.label} className="flex flex-col gap-2 p-3">
                <div className="flex items-center gap-1.5">
                  <metric.icon className="text-content-subtle size-3.5" />
                  <div className="text-xs font-medium text-neutral-500">
                    {metric.label}
                  </div>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm font-medium text-neutral-900">
                    {metric.percentage}
                  </span>
                  <span className="text-content-subtle text-sm font-medium">
                    {metric.count}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function CampaignMetricsLoadingSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex flex-col gap-2 p-3">
          <div className="flex h-4 items-center gap-1.5">
            <div className="size-3.5 animate-pulse rounded bg-neutral-200" />
            <div className="text-xs font-medium">
              <div className="h-[1em] w-16 animate-pulse rounded bg-neutral-200" />
            </div>
          </div>
          <div className="flex h-5 justify-between">
            <span className="text-sm font-medium">
              <div className="h-[1em] w-12 animate-pulse rounded bg-neutral-200" />
            </span>
            <span className="text-sm font-medium">
              <div className="h-[1em] w-8 animate-pulse rounded bg-neutral-200" />
            </span>
          </div>
        </div>
      ))}
    </>
  );
}

export const calculateCampaignPercentages = (summary: CampaignSummary) => {
  const { sent, delivered, opened, bounced } = summary;

  if (sent === 0) {
    return {
      ...summary,
      deliveredPercentage: 0,
      openedPercentage: 0,
      bouncedPercentage: 0,
    };
  }

  const sentInverse = 100 / sent;
  const deliveredInverse = delivered > 0 ? 100 / delivered : 0;

  return {
    ...summary,
    deliveredPercentage: Number((delivered * sentInverse).toFixed(2)),
    openedPercentage: Number((opened * deliveredInverse).toFixed(2)),
    bouncedPercentage: Number((bounced * sentInverse).toFixed(2)),
  };
};
