export const dynamic = "force-dynamic";

import { EVENT_TYPES } from "@/lib/analytics/constants";
import { dub } from "@/lib/dub";
import { Button, CopyButton } from "@dub/ui";
import { Check } from "@dub/ui/src/icons";
import { getPrettyUrl } from "@dub/utils";
import { Mail } from "lucide-react";
import { ActivityList } from "./activity-list";
import { EventTabs } from "./event-tabs";
import ReferralsPageClient from "./page-client";

export default async function ReferralsPage({
  params: { slug },
  searchParams,
}: {
  params: { slug: string };
  searchParams: { event?: string; page?: string };
}) {
  const link = `https://refer.dub.co/${slug}`;
  const event = EVENT_TYPES.find((e) => e === searchParams.event) ?? "clicks";
  const page = parseInt(searchParams.page ?? "1") || 1;

  const eventsParams = {
    domain: "refer.dub.co",
    key: slug,
    event,
  };

  const events = await dub.events.list({
    ...eventsParams,
    page: page - 1,
  });

  // Ideally the Dub SDK/API would give us hasNext info, but at least this could speed things up with caching
  const nextEvents = await dub.events.list({
    ...eventsParams,
    page: page,
  });

  return (
    <ReferralsPageClient>
      <div>
        <div className="rounded-xl border border-gray-200 p-9">
          <h1 className="text-2xl font-semibold text-black">Refer and earn</h1>
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
                  <p className="text-base font-medium text-gray-800">{title}</p>
                  <p className="text-xs text-gray-500">{description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 grid gap-1.5">
            <p className="text-xs text-gray-500">Referral Link</p>
            <div className="grid max-w-md grid-cols-[1fr_auto] gap-x-2">
              <div className="flex h-9 items-center justify-between gap-x-2 rounded-lg border border-gray-300 bg-white py-1.5 pl-4 pr-2">
                <p className="text-sm text-gray-500">{getPrettyUrl(link)}</p>
                <CopyButton
                  value={link}
                  variant="neutral"
                  className="p-1.5 text-gray-500"
                />
              </div>
              <Button
                text="Invite via email"
                icon={<Mail className="size-4" />}
                className="h-9 rounded-lg"
              />
            </div>
          </div>
        </div>
        <div className="mt-12">
          <div className="mb-5 flex items-end justify-between">
            <h2 className="text-xl font-semibold text-gray-800">Activity</h2>
            <EventTabs event={event} />
          </div>
          <ActivityList
            event={event}
            page={page}
            hasNextPage={nextEvents.length > 0}
            events={events as any}
          />
        </div>
      </div>
    </ReferralsPageClient>
  );
}
