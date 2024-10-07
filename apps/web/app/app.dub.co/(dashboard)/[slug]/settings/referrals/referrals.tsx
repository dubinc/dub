"use client";

import { EventType } from "@/lib/analytics/types";
import { DubProvider } from "@dub/blocks";
import { EventTabs } from "./event-tabs";
import { Events } from "./events";
import { Stats } from "./stats";

interface ReferralsProps {
  slug: string;
  event: EventType | undefined;
  page: string | undefined;
  publicToken: string | undefined | null;
}

export const Referrals = ({
  slug,
  event,
  page,
  publicToken,
}: ReferralsProps) => {
  if (!publicToken) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-center">
        <h2 className="mb-2 text-2xl font-semibold text-gray-800">
          Unavailable
        </h2>
        <p className="text-gray-600">Sorry, the referral token is not found.</p>
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

export const ReferralsEmbed = ({ publicToken }: { publicToken: string }) => {
  return (
    <>
      <iframe
        src={`http://localhost:8888/embed?token=${publicToken}`}
        style={{
          width: "100%",
          height: "100vh",
          border: "none",
        }}
      ></iframe>
    </>
  );
};
