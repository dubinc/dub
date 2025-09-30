"use client";

import useCommissionsCount from "@/lib/swr/use-commissions-count";
import { useRouterStuff } from "@dub/ui";
import { Icon, Users } from "@dub/ui/icons";
import { cn, nFormatter } from "@dub/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CampaignTypeBadges } from "./campaign-type-badges";

interface StatsFilterProps {
  label: string;
  href: string;
  count?: number;
  icon: Icon;
  iconClassName?: string;
  error: boolean;
  active: boolean;
}

export function CampaignStats() {
  const { slug } = useParams();
  const { queryParams } = useRouterStuff();
  const { searchParamsObj } = useRouterStuff();

  const { commissionsCount, error } = useCommissionsCount({
    exclude: ["status", "page"],
  });

  return (
    <div className="grid w-full grid-cols-3 gap-1 overflow-x-auto sm:gap-2">
      <StatsFilter
        label="All"
        href={`/${slug}/program/campaigns`}
        count={commissionsCount?.all.count}
        icon={Users}
        iconClassName="text-neutral-600 bg-neutral-100"
        error={!!error}
        active={searchParamsObj.type == undefined}
      />
      <StatsFilter
        label={CampaignTypeBadges.marketing.label}
        href={
          queryParams({
            set: { type: "marketing" },
            getNewPath: true,
          }) as string
        }
        count={commissionsCount?.pending.count}
        icon={CampaignTypeBadges.marketing.icon}
        iconClassName={CampaignTypeBadges.marketing.iconClassName}
        error={!!error}
        active={searchParamsObj.type === "marketing"}
      />
      <StatsFilter
        label={CampaignTypeBadges.transactional.label}
        href={
          queryParams({
            set: { type: "transactional" },
            getNewPath: true,
          }) as string
        }
        count={commissionsCount?.processed.count}
        icon={CampaignTypeBadges.transactional.icon}
        iconClassName={CampaignTypeBadges.transactional.iconClassName}
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
  icon: Icon,
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
          <div
            className={cn(
              "flex size-6 items-center justify-center rounded-md",
              iconClassName,
            )}
          >
            <Icon className="size-3.5" />
          </div>
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
