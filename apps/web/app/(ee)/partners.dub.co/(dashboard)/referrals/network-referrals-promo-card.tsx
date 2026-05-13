"use client";

import { NETWORK_BONUS_REWARD } from "@/lib/partner-referrals/constants";
import { cn } from "@dub/utils";
import Link from "next/link";

export function NetworkReferralsPromoCard({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-[220px] flex-col justify-end overflow-hidden rounded-xl bg-zinc-900 p-6 text-white",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-6 -top-8 h-28 w-44 rotate-12 rounded-lg border border-white/20 bg-gradient-to-br from-neutral-700 to-neutral-900 shadow-xl" />
        <div className="absolute right-8 top-2 h-24 w-40 -rotate-6 rounded-lg border border-white/15 bg-gradient-to-br from-neutral-600 to-neutral-800 shadow-lg" />
        <div className="absolute -top-4 right-20 h-24 w-36 rotate-3 rounded-lg border border-white/10 bg-neutral-800/90 shadow-md" />
      </div>
      <div className="relative z-[1] mt-14 space-y-1.5">
        <h3 className="text-base font-semibold leading-6 tracking-tight">
          Dub Network Referrals
        </h3>
        <p className="max-w-[22rem] text-sm font-normal leading-5 text-zinc-400">
          Bring on other partners to the Dub network, and earn from their
          activity for up to {NETWORK_BONUS_REWARD.maxDuration} months.{" "}
          <Link
            href="https://dub.co/docs/partners/quickstart"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-white underline decoration-white/40 underline-offset-2 hover:decoration-white"
          >
            Learn more
          </Link>
        </p>
      </div>
    </div>
  );
}
