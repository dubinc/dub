import { getEvents } from "@/lib/actions/get-events";
import { getReferralLink } from "@/lib/actions/get-referral-link";
import { getTotalEvents } from "@/lib/actions/get-total-events";
import { EventType } from "@/lib/analytics/types";
import {
  REFERRAL_CLICKS_QUOTA_BONUS,
  REFERRAL_CLICKS_QUOTA_BONUS_MAX,
  REFERRAL_REVENUE_SHARE,
} from "@/lib/referrals/constants";
import { clickEventEnrichedSchema } from "@/lib/zod/schemas/clicks";
import { leadEventEnrichedSchema } from "@/lib/zod/schemas/leads";
import { saleEventEnrichedSchema } from "@/lib/zod/schemas/sales";
import { EventListSkeleton } from "@dub/blocks";
import { Wordmark } from "@dub/ui";
import { Check } from "@dub/ui/src/icons";
import { nFormatter, randomValue } from "@dub/utils";
import { subDays } from "date-fns";
import { Suspense } from "react";
import { z } from "zod";
import { ActivityList } from "./activity-list";
import { EventTabs } from "./event-tabs";
import { HeroBackground } from "./hero-background";
import ReferralsPageClient from "./page-client";
import ReferralLink, { ReferralLinkSkeleton } from "./referral-link";
import { Stats } from "./stats";

export const revalidate = 0;

export default function ReferralsPage({
  params: { slug },
  searchParams,
}: {
  params: { slug: string };
  searchParams: { event?: string; page?: string };
}) {
  const event = (searchParams.event ?? "clicks") as EventType;
  const page = parseInt(searchParams.page ?? "0") || 0;

  return (
    <ReferralsPageClient>
      <div>
        <div className="relative">
          <div className="relative overflow-hidden rounded-xl border border-gray-200 p-4 sm:p-9">
            <Suspense>
              <HeroBackground slug={slug} />
            </Suspense>

            <div className="relative">
              <h1 className="text-xl font-semibold text-black sm:text-2xl">
                Refer and earn
              </h1>

              {/* Benefits */}
              <div className="mt-6 flex flex-col gap-6">
                {[
                  {
                    title: `${nFormatter(REFERRAL_REVENUE_SHARE * 100)}% recurring revenue`,
                    description: "per paying customer (up to 1 year)",
                  },
                  {
                    title: `${nFormatter(REFERRAL_CLICKS_QUOTA_BONUS)} extra clicks quota per month`,
                    description: `per signup (up to ${nFormatter(REFERRAL_CLICKS_QUOTA_BONUS_MAX, { full: true })} total)`,
                  },
                ].map(({ title, description }) => (
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-full border border-gray-200 bg-gradient-to-t from-gray-100 to-white">
                      <div className="rounded-full bg-green-500 p-0.5">
                        <Check className="size-3.5 text-white" />
                      </div>
                    </div>
                    <div>
                      <p className="text-base font-medium text-gray-800">
                        {title}
                      </p>
                      <p className="text-xs text-gray-500">{description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Referral link + invite button or empty/error states */}
              <Suspense fallback={<ReferralLinkSkeleton />}>
                <ReferralLink slug={slug} />
              </Suspense>
            </div>
          </div>

          {/* Powered by Dub Conversions */}
          <a
            href="https://d.to/conversions"
            target="_blank"
            className="mt-2 flex items-center justify-center gap-2 rounded-lg border-gray-100 bg-white p-2 transition-colors hover:border-gray-200 active:bg-gray-50 md:absolute md:bottom-3 md:right-3 md:mt-0 md:translate-x-0 md:border md:drop-shadow-sm"
          >
            <Wordmark className="h-4" />
            <p className="text-xs text-gray-800">
              Powered by <span className="font-medium">Dub Conversions</span>
            </p>
          </a>
        </div>
        <div className="mt-8">
          <Stats slug={slug} />
        </div>
        <div className="mt-12">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-xl font-semibold text-gray-800">Activity</h2>
            <EventTabs />
          </div>
          <Suspense
            key={`${slug}-${event}-${page}`}
            fallback={<EventListSkeleton />}
          >
            <ActivityListRSC slug={slug} event={event} page={page} />
          </Suspense>
        </div>
      </div>
    </ReferralsPageClient>
  );
}

const placeholderEvents = {
  clicks: [...Array(10)].map(
    (_, idx) =>
      ({
        timestamp: subDays(new Date(), idx).toISOString(),
        click_id: "1",
        link_id: "1",
        domain: "refer.dub.co",
        key: "",
        url: "https://dub.co",
        country: randomValue(["US", "GB", "CA", "AU", "DE", "FR", "ES", "IT"]),
      }) as z.infer<typeof clickEventEnrichedSchema>,
  ),
  leads: [...Array(10)].map(
    (_, idx) =>
      ({
        timestamp: subDays(new Date(), idx).toISOString(),
        click_id: "1",
        link_id: "1",
        domain: "refer.dub.co",
        key: "",
        url: "https://dub.co",
        country: randomValue(["US", "GB", "CA", "AU", "DE", "FR", "ES", "IT"]),
      }) as z.infer<typeof leadEventEnrichedSchema>,
  ),
  sales: [...Array(10)].map(
    (_, idx) =>
      ({
        timestamp: subDays(new Date(), idx).toISOString(),
        click_id: "1",
        link_id: "1",
        domain: "refer.dub.co",
        key: "",
        url: "https://dub.co",
        country: randomValue(["US", "GB", "CA", "AU", "DE", "FR", "ES", "IT"]),
        event_name: [
          "Subscription creation",
          "Subscription paid",
          "Plan upgraded",
        ][idx % 3],
        amount: [1100, 4900, 2400][idx % 3],
      }) as z.infer<typeof saleEventEnrichedSchema>,
  ),
};

async function ActivityListRSC({
  slug,
  event,
  page,
}: {
  slug: string;
  event: EventType;
  page: number;
}) {
  const link = await getReferralLink(slug);
  if (!link) {
    return (
      <ActivityList
        events={placeholderEvents[event]}
        totalEvents={placeholderEvents[event].length}
        demo
      />
    );
  }

  const events = await getEvents({ linkId: link.id, event, page });

  const totalEvents = await getTotalEvents(link.id);

  return (
    <ActivityList
      events={events as any}
      totalEvents={totalEvents[event] ?? 0}
    />
  );
}
