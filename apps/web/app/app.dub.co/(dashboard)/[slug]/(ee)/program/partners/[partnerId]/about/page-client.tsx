"use client";

import usePartner from "@/lib/swr/use-partner";
import { OnlinePresenceSummary } from "@/ui/partners/online-presence-summary";
import { useParams } from "next/navigation";

export function ProgramPartnerAboutPageClient() {
  const { partnerId } = useParams() as { partnerId: string };
  const { partner, error } = usePartner({ partnerId });

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
        />
      </div>
    </>
  ) : error ? (
    <div className="flex justify-center py-16">
      <span className="text-content-subtle text-sm">
        Failed to load partner links
      </span>
    </div>
  ) : (
    [...Array(2)].map((_, index) => (
      <div key={index} className="flex flex-col gap-2">
        <div className="h-4 w-20 animate-pulse rounded-md bg-neutral-200" />
        <div className="h-4 w-40 animate-pulse rounded-md bg-neutral-200" />
      </div>
    ))
  );
}
