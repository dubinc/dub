"use client";

import { usePartnerDateRange } from "@/lib/analytics/use-partner-date-range";
import { testIds } from "@/lib/e2e/test-ids";
import { usePartnerProfileEarningsAnalytics } from "@/lib/swr/use-partner-profile-earnings";
import { ProgramLogo } from "@/ui/partners/program-logo";
import { Hyperlink } from "@dub/ui/icons";
import { cn, currencyFormatter, getPrettyUrl } from "@dub/utils";
import Link from "next/link";
import {
  OVERVIEW_CARD_ROW_CLASSNAME,
  OverviewCard,
  OverviewCardList,
} from "./overview-card";
import { useEarningsPageHref } from "./use-earnings-page-href";

export function TopLinksCard({ className }: { className?: string }) {
  const { start, end, interval } = usePartnerDateRange();
  const earningsPageHref = useEarningsPageHref({ groupBy: "linkId" });

  const { data: links, error } = usePartnerProfileEarningsAnalytics({
    groupBy: "linkId",
    limit: 6,
    interval,
    start,
    end,
  });

  return (
    <OverviewCard
      title="Top links by earnings"
      viewAllHref={earningsPageHref}
      className={cn("rounded-2xl", className)}
      testId={testIds.partnerOverview.topLinks}
    >
      <OverviewCardList
        items={links}
        rowCount={6}
        error={error}
        getKey={(link) => link.id}
        emptyState={{
          icon: <Hyperlink className="size-4" />,
          title: "No earnings in this date range",
        }}
        renderItem={(link) => (
          <Link
            href={`/programs/${link.program.slug}`}
            className={cn(
              OVERVIEW_CARD_ROW_CLASSNAME,
              "transition-colors duration-100 hover:bg-neutral-50 active:bg-neutral-100",
            )}
          >
            <ProgramLogo program={link.program} />
            <span
              className="text-content-emphasis min-w-0 grow truncate text-xs font-semibold"
              title={link.url}
            >
              {getPrettyUrl(link.shortLink)}
            </span>
            <span className="shrink-0 text-xs font-medium text-neutral-500">
              {currencyFormatter(link.earnings)}
            </span>
          </Link>
        )}
      />
    </OverviewCard>
  );
}
