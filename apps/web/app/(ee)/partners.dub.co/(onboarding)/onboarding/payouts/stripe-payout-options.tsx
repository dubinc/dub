"use client";

import { StripePayoutMethodOptions } from "@/ui/partners/payout-method-options";
import Link from "next/link";

export function StripePayoutOptions() {
  return (
    <>
      <div className="mx-2 overflow-hidden rounded-xl border border-neutral-300 bg-white">
        <div className="flex items-center justify-center border-b border-neutral-300 bg-neutral-50 py-4">
          <img
            src="https://assets.dub.co/misc/stripe-wordmark.svg"
            alt="Stripe"
            className="h-10 w-auto"
          />
        </div>

        <div className="p-4">
          <div className="flex flex-col items-center bg-white pb-4 text-center text-sm font-normal text-neutral-600">
            <p className="text-sm text-neutral-600">
              We use Stripe for secure payouts.
            </p>
            <p className="text-sm text-neutral-600">
              Connect your preferred payout method to receive payments.
            </p>
          </div>

          <StripePayoutMethodOptions />
        </div>
      </div>

      <Link
        href="/programs"
        className="mt-6 block text-center text-sm font-medium text-neutral-800 transition-colors hover:text-neutral-950"
      >
        I'll complete this later
      </Link>
    </>
  );
}
