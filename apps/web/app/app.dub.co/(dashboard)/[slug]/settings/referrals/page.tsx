import { EventType } from "@/lib/analytics/types";
import { dub } from "@/lib/dub";
import { EventListSkeleton } from "@dub/blocks";
import { CopyButton, Logo } from "@dub/ui";
import { Check, CircleWarning } from "@dub/ui/src/icons";
import { getPrettyUrl } from "@dub/utils";
import {
  ClicksCount,
  LeadsCount,
  SalesCount,
} from "dub/dist/commonjs/models/components";
import { Suspense } from "react";
import { ActivityList } from "./activity-list";
import { EventTabs } from "./event-tabs";
import { GenerateButton } from "./generate-button";
import { InviteButton } from "./invite-button";
import ReferralsPageClient from "./page-client";

export const dynamic = "auto";

export default async function ReferralsPage({
  params: { slug },
  searchParams,
}: {
  params: { slug: string };
  searchParams: { event?: string; page?: string };
}) {
  const linkUrl = `https://refer.dub.co/${slug}`;
  const event = (searchParams.event ?? "clicks") as EventType;
  const page = parseInt(searchParams.page ?? "0") || 0;

  let errorCode = null;
  try {
    await dub.links.get({
      domain: "refer.dub.co",
      key: slug,
    });
  } catch (e) {
    errorCode = e?.error?.code ?? "error";
  }

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
            <div className="mt-8">
              {!errorCode ? (
                <div className="grid gap-1.5">
                  <p className="text-xs text-gray-500">Referral Link</p>
                  <div className="grid grid-cols-1 gap-x-2 gap-y-2 sm:max-w-sm sm:grid-cols-[1fr_auto] xl:max-w-md">
                    <div className="flex h-9 items-center justify-between gap-x-2 rounded-lg border border-gray-300 bg-white py-1.5 pl-4 pr-2">
                      <p className="text-sm text-gray-500">
                        {getPrettyUrl(linkUrl)}
                      </p>
                      <CopyButton
                        value={linkUrl}
                        variant="neutral"
                        className="p-1.5 text-gray-500"
                      />
                    </div>
                    <InviteButton url={linkUrl} />
                  </div>
                </div>
              ) : errorCode === "not_found" ? (
                <GenerateButton />
              ) : (
                <p className="text-sm text-gray-500">
                  <CircleWarning className="-mt-0.5 mr-1.5 inline-block size-4" />
                  Failed to load referral link. Please try again later or
                  contact support.
                </p>
              )}
            </div>
          </div>

          {/* Powered by Dub Conversions */}
          <a
            href="https://d.to/conversions"
            target="_blank"
            className="mt-2 flex items-center justify-center gap-2 rounded-lg border-gray-100 bg-white p-2 transition-colors hover:border-gray-200 active:bg-gray-50 md:absolute md:bottom-3 md:right-3 md:mt-0 md:translate-x-0 md:border md:drop-shadow-sm"
          >
            <Logo className="size-4" />
            <p className="text-xs text-gray-800">
              Powered by <span className="font-medium">Dub Conversions</span>
            </p>
          </a>
        </div>
        {!errorCode && (
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
        )}
      </div>
    </ReferralsPageClient>
  );
}

async function ActivityListRSC({
  slug,
  event,
  page,
}: {
  slug: string;
  event: EventType;
  page: number;
}) {
  const eventsParams = {
    domain: "refer.dub.co",
    key: slug,
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
