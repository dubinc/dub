"use client";

import usePartnerNetworkInvitesUsage from "@/lib/swr/use-partner-network-invites-usage";
import { EnvelopeArrowRight, Tooltip } from "@dub/ui";
import { cn } from "@dub/utils";

export function InvitesUsage() {
  const { remaining } = usePartnerNetworkInvitesUsage();

  return remaining === undefined ? null : (
    <Tooltip
      content={
        <p className="max-w-xs p-2 text-center text-xs font-medium text-neutral-600">
          Invitation limits are based on a 7-day rolling period. If you need
          more weekly invites,{" "}
          <a
            href="https://dub.co/contact/sales"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            contact us
          </a>
          .
        </p>
      }
      align="end"
    >
      <div className="animate-fade-in flex cursor-default items-center gap-2">
        <EnvelopeArrowRight className="text-content-default size-4 shrink-0" />
        <span
          className={cn(
            "text-content-emphasis text-sm font-medium",
            remaining === 0 && "text-content-subtle",
          )}
        >
          <span
            className={cn(remaining > 0 && remaining <= 5 && "text-violet-600")}
          >
            {remaining} <span className="hidden sm:inline">invites</span>
          </span>{" "}
          remaining
        </span>
      </div>
    </Tooltip>
  );
}
