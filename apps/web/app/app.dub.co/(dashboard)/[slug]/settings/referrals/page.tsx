import { EventType } from "@/lib/analytics/types";
import { dub } from "@/lib/dub";
import { EventListSkeleton } from "@/ui/blocks/event-list";
import { CopyButton, Logo } from "@dub/ui";
import { Check } from "@dub/ui/src/icons";
import { getPrettyUrl } from "@dub/utils";
import {
  ClicksCount,
  LeadsCount,
  SalesCount,
} from "dub/dist/commonjs/models/components";
import { Suspense } from "react";
import { ActivityList } from "./activity-list";
import { EventTabs } from "./event-tabs";
import { InviteButton } from "./invite-button";
import ReferralsPageClient from "./page-client";

export default async function ReferralsPage({
  params: { slug },
  searchParams,
}: {
  params: { slug: string };
  searchParams: { event?: string; page?: string };
}) {
  const link = `https://refer.dub.co/${slug}`;
  const event = (searchParams.event ?? "clicks") as EventType;
  const page = parseInt(searchParams.page ?? "0") || 0;

  return (
    <ReferralsPageClient>
      <div>
        <div className="relative">
          <div className="rounded-xl border border-gray-200 p-4 sm:p-9">
            <h1 className="text-xl font-semibold text-black sm:text-2xl">
              Refer and earn
            </h1>

            {/* Benefits */}
            <div className="mt-6 flex flex-col gap-6">
              {[
                {
                  title: "10% recurring revenue",
                  description: "per paying customer (up to 1 year)",
                },
                {
                  title: "500 extra clicks quota per month",
                  description: "per signup (up to 16,000 total)",
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

            {/* Referral link + invite button */}
            <div className="mt-8 grid gap-1.5">
              <p className="text-xs text-gray-500">Referral Link</p>
              <div className="grid grid-cols-1 gap-x-2 gap-y-2 sm:max-w-sm sm:grid-cols-[1fr_auto] xl:max-w-md">
                <div className="flex h-9 items-center justify-between gap-x-2 rounded-lg border border-gray-300 bg-white py-1.5 pl-4 pr-2">
                  <p className="text-sm text-gray-500">{getPrettyUrl(link)}</p>
                  <CopyButton
                    value={link}
                    variant="neutral"
                    className="p-1.5 text-gray-500"
                  />
                </div>
                <InviteButton url={link} />
              </div>
            </div>
          </div>

          {/* Powered by Dub Conversions */}
          <div className="mt-2 flex items-center justify-center gap-2 rounded-lg border-gray-100 bg-white p-2 md:absolute md:bottom-3 md:right-3 md:mt-0 md:translate-x-0 md:border md:drop-shadow-sm">
            <Logo className="size-4" />
            <p className="text-xs text-gray-800">
              Powered by <span className="font-medium">Dub Conversions</span>
            </p>
          </div>
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
            <ActivityListRSC workspaceSlug={slug} event={event} page={page} />
          </Suspense>
        </div>
      </div>
    </ReferralsPageClient>
  );
}

async function ActivityListRSC({
  workspaceSlug,
  event,
  page,
}: {
  workspaceSlug: string;
  event: EventType;
  page: number;
}) {
  const eventsParams = {
    domain: "refer.dub.co",
    key: workspaceSlug,
    event,
  };

  const events = await dub.events.list({
    ...eventsParams,
    interval: "all",
    page,
  });

  const totalEvents = (await dub.analytics.retrieve({
    ...eventsParams,
    interval: event === "sales" ? "all" : "all_unfiltered", // temp fix till we add sales to all_unfiltered
  })) as ClicksCount | LeadsCount | SalesCount;

  return (
    <ActivityList events={events as any} totalEvents={totalEvents[event]} />
  );
}
