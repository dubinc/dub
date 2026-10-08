"use client";

import { testIds } from "@/lib/e2e/test-ids";
import { usePartnerProfileTopEarnings } from "@/lib/swr/use-partner-profile-top-earnings";
import { Hyperlink } from "@dub/ui/icons";
import { currencyFormatter, getPrettyUrl } from "@dub/utils";
import {
  OVERVIEW_CARD_ROW_CLASSNAME,
  OverviewCard,
  OverviewCardList,
  ProgramLogo,
} from "./overview-card";
import { useOverviewDateRange } from "./use-overview-date-range";

export function TopLinksCard() {
  const { start, end, interval } = useOverviewDateRange();

  const { data: links, error } = usePartnerProfileTopEarnings({
    groupBy: "linkId",
    limit: 6,
    interval,
    start,
    end,
  });

  return (
    <OverviewCard
      title="Top links by earnings"
      className="rounded-2xl"
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
          <div className={OVERVIEW_CARD_ROW_CLASSNAME}>
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
          </div>
        )}
      />
    </OverviewCard>
  );
}
