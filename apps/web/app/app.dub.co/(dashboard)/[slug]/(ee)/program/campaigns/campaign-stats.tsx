"use client";

import { CampaignType } from "@dub/prisma/client";
import { useRouterStuff } from "@dub/ui";
import { Users } from "@dub/ui/icons";
import { cn, nFormatter } from "@dub/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { CAMPAIGN_TYPE_BADGES } from "./campaign-type-badges";
import { CampaignTypeIcon } from "./campaign-type-icon";
import useCampaignsCount from "./use-campaigns-count";

interface StatsFilterProps {
  label: string;
  href: string;
  count?: number;
  icon: React.ReactNode;
  iconClassName?: string;
  error: boolean;
  active: boolean;
}

interface CampaignsCountByType {
  type: CampaignType;
  _count: number;
}

export function CampaignStats() {
  const { slug } = useParams();
  const { queryParams } = useRouterStuff();
  const { searchParamsObj } = useRouterStuff();

  const { campaignsCount, error } = useCampaignsCount<CampaignsCountByType[]>({
    exclude: ["type", "page"],
    groupBy: "type",
  });

  const { totalCount, marketingCount, transactionalCount } = useMemo(() => {
    const marketingCampaign = campaignsCount?.find(
      (c) => c.type === "marketing",
    ) ?? {
      _count: 0,
    };

    const transactionalCampaign = campaignsCount?.find(
      (c) => c.type === "transactional",
    ) ?? {
      _count: 0,
    };

    return {
      totalCount: marketingCampaign._count + transactionalCampaign._count,
      marketingCount: marketingCampaign._count,
      transactionalCount: transactionalCampaign._count,
    };
  }, [campaignsCount]);

  return (
    <div className="grid w-full grid-cols-3 gap-1 overflow-x-auto sm:gap-2">
      <StatsFilter
        label="All"
        href={`/${slug}/program/campaigns`}
        count={totalCount}
        icon={<Users className="size-3.5" />}
        iconClassName="text-neutral-600 bg-neutral-100"
        error={!!error}
        active={searchParamsObj.type == undefined}
      />
      <StatsFilter
        label={CAMPAIGN_TYPE_BADGES.marketing.label}
        href={
          queryParams({
            set: { type: "marketing" },
            getNewPath: true,
          }) as string
        }
        count={marketingCount}
        icon={<CampaignTypeIcon type="marketing" />}
        error={!!error}
        active={searchParamsObj.type === "marketing"}
      />
      <StatsFilter
        label={CAMPAIGN_TYPE_BADGES.transactional.label}
        href={
          queryParams({
            set: { type: "transactional" },
            getNewPath: true,
          }) as string
        }
        count={transactionalCount}
        icon={<CampaignTypeIcon type="transactional" />}
        error={!!error}
        active={searchParamsObj.type === "transactional"}
      />
    </div>
  );
}

function StatsFilter({
  label,
  href,
  count,
  error,
  icon,
  iconClassName,
  active,
}: StatsFilterProps) {
  return (
    <Link href={href}>
      <div
        className={cn(
          "flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-left transition-colors duration-75 hover:bg-neutral-50 active:bg-neutral-100",
          active && "border-2 border-neutral-700",
        )}
      >
        <div className="flex items-center gap-2">
          {iconClassName ? (
            <div
              className={cn(
                "flex size-6 items-center justify-center rounded-md",
                iconClassName,
              )}
            >
              {icon}
            </div>
          ) : (
            icon
          )}
          <div className="text-xs font-medium text-neutral-500">{label}</div>
        </div>

        <div>
          {count !== undefined || error ? (
            <div className="text-base font-semibold leading-tight text-neutral-800">
              {error ? "-" : nFormatter(count, { full: true })}
            </div>
          ) : (
            <div className="h-5 w-10 min-w-0 animate-pulse rounded-md bg-neutral-200" />
          )}
        </div>
      </div>
    </Link>
  );
}
