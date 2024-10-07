"use client";

import { EventType } from "@/lib/analytics/types";
import { DubProvider } from "@dub/blocks";
import { EventTabs } from "./event-tabs";
import { Events } from "./events";
import { Stats } from "./stats";

interface ReferralsProps {
  event: EventType | undefined;
  page: string | undefined;
  publicToken: string | undefined | null;
}

export const Referrals = ({ event, page, publicToken }: ReferralsProps) => {
  if (!publicToken) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-center">
        <h2 className="mb-2 text-2xl font-semibold text-gray-800">
          Unavailable
        </h2>
        <p className="text-gray-600">The referral token is not found.</p>
      </div>
    );
  }

  return (
    <DubProvider publicToken={publicToken}>
      {/* Stats */}
      <div className="mt-8">
        <Stats />
      </div>

      {/* Events */}
      <div className="mt-12">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-xl font-semibold text-gray-800">Activity</h2>
          <EventTabs />
        </div>
        <Events event={event || "clicks"} page={page || "1"} />
      </div>
    </DubProvider>
  );
};
