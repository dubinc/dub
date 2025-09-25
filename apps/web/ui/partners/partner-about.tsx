"use client";

import {
  industryInterestsMap,
  monthlyTrafficAmountsMap,
  preferredEarningStructuresMap,
  salesChannelsMap,
} from "@/lib/partners/partner-profile";
import { EnrolledPartnerProps } from "@/lib/types";
import { OnlinePresenceSummary } from "@/ui/partners/online-presence-summary";
import { Icon } from "@dub/ui";

export function PartnerAbout({
  partner,
  error,
}: {
  partner?: EnrolledPartnerProps;
  error?: any;
}) {
  return partner ? (
    <>
      <div className="flex flex-col gap-2">
        <h3 className="text-content-emphasis text-xs font-semibold">
          Description
        </h3>
        <p className="text-content-default text-xs">
          {partner.description || (
            <span className="italic text-neutral-400">
              No description provided
            </span>
          )}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-content-emphasis text-xs font-semibold">
          Website and socials
        </h3>
        <OnlinePresenceSummary
          partner={partner}
          showLabels={false}
          className="gap-y-2"
          emptyClassName="text-xs"
        />
      </div>

      {Boolean(partner.industryInterests?.length) && (
        <div className="flex flex-col gap-2">
          <h3 className="text-content-emphasis text-xs font-semibold">
            Industry interests
          </h3>
          <div className="flex flex-wrap gap-1">
            {partner.industryInterests?.map((interest) => {
              const data = industryInterestsMap[interest];
              if (!data) return null;
              return <ListPill key={interest} {...data} />;
            })}
          </div>
        </div>
      )}

      {Boolean(partner.salesChannels?.length) && (
        <div className="flex flex-col gap-2">
          <h3 className="text-content-emphasis text-xs font-semibold">
            Sales channels
          </h3>
          <div className="flex flex-wrap gap-1">
            {partner.salesChannels?.map((salesChannel) => {
              const data = salesChannelsMap[salesChannel];
              if (!data) return null;
              return <ListPill key={salesChannel} {...data} />;
            })}
          </div>
        </div>
      )}

      {Boolean(partner.preferredEarningStructures?.length) && (
        <div className="flex flex-col gap-2">
          <h3 className="text-content-emphasis text-xs font-semibold">
            Preferred rewards
          </h3>
          <div className="flex flex-wrap gap-1">
            {partner.preferredEarningStructures?.map((earningStructure) => {
              const data = preferredEarningStructuresMap[earningStructure];
              if (!data) return null;
              return <ListPill key={earningStructure} {...data} />;
            })}
          </div>
        </div>
      )}

      {Boolean(partner.monthlyTraffic) && (
        <div className="flex flex-col gap-2">
          <h3 className="text-content-emphasis text-xs font-semibold">
            Monthly traffic
          </h3>
          <span className="text-content-default text-xs">
            {monthlyTrafficAmountsMap[partner.monthlyTraffic!]?.label ?? "-"}
          </span>
        </div>
      )}
    </>
  ) : error ? (
    <div className="flex justify-center py-16">
      <span className="text-content-subtle text-sm">
        Failed to load partner details
      </span>
    </div>
  ) : (
    [...Array(4)].map((_, index) => (
      <div key={index} className="flex flex-col gap-2">
        <div className="h-4 w-20 animate-pulse rounded-md bg-neutral-200" />
        <div className="h-4 w-40 animate-pulse rounded-md bg-neutral-200" />
      </div>
    ))
  );
}

function ListPill({ icon: Icon, label }: { icon?: Icon; label: string }) {
  return (
    <div className="flex h-7 items-center gap-1.5 rounded-full bg-neutral-100 px-2">
      {Icon && <Icon className="text-content-emphasis size-3" />}
      <span className="text-content-default text-xs font-medium">{label}</span>
    </div>
  );
}
