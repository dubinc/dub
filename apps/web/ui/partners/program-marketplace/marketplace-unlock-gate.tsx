"use client";

import { getMarketplaceRequirements } from "@/lib/network/get-marketplace-requirements";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import {
  ChevronRight,
  CircleCheckFill,
  CircleDotted,
  Lock,
} from "@dub/ui/icons";
import Link from "next/link";

function PlaceholderCard() {
  return (
    <div className="border-border-subtle flex w-[180px] shrink-0 flex-col gap-4 rounded-xl border bg-white p-3 shadow-[0px_4px_12px_0px_rgba(0,0,0,0.05)]">
      <Lock className="text-content-subtle size-6" />
      <div className="flex flex-col gap-2">
        <div className="h-2.5 w-8 rounded bg-neutral-200" />
        <div className="h-2.5 w-[74px] rounded bg-neutral-200" />
      </div>
      <div className="h-5 w-full rounded bg-neutral-800" />
    </div>
  );
}

export function MarketplaceUnlockGate() {
  const { partner } = usePartnerProfile();

  if (!partner) return null;

  const requirements = getMarketplaceRequirements({ partner });

  return (
    <div className="flex min-h-[calc(100dvh-120px)] flex-col items-center justify-center py-16">
      <div className="flex w-[350px] flex-col items-center gap-6">
        {/* Decorative Cards with scroll animation */}
        <div className="relative flex h-[132px] w-full items-center overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)]">
          {/* Duplicate cards for seamless loop */}
          {[...Array(2)].map((_, idx) => (
            <div
              key={idx}
              className="flex w-max min-w-max animate-infinite-scroll items-center gap-6 pl-6 [--scroll:-100%] [animation-duration:30s]"
              aria-hidden={idx !== 0}
            >
              {[0, 1, 2].map((i) => (
                <PlaceholderCard key={i} />
              ))}
            </div>
          ))}
        </div>

        {/* Text */}
        <div className="flex flex-col gap-2 text-center">
          <h2 className="text-content-emphasis text-base font-semibold">
            Unlock marketplace access
          </h2>
          <p className="text-content-subtle text-sm">
            Complete the following tasks to unlock the Dub marketplace.
          </p>
        </div>

        {/* Tasks Card */}
        <div className="border-border-subtle flex w-full flex-col rounded-[10px] border bg-white p-2">
          {requirements.map(({ label, href, completed }) => (
            <Link
              key={label}
              href={href}
              className="hover:bg-bg-subtle flex items-center justify-between rounded-lg p-2.5 transition-colors"
            >
              <div className="flex items-center gap-2">
                {completed ? (
                  <CircleCheckFill className="size-[18px] text-green-500" />
                ) : (
                  <CircleDotted className="text-content-subtle size-[18px]" />
                )}
                <span className="text-content-secondary text-sm font-medium">
                  {label}
                </span>
              </div>
              <ChevronRight className="text-content-subtle size-2.5" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
