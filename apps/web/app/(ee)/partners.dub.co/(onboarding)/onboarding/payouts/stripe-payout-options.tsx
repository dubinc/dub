"use client";

import { ConnectPayoutButton } from "@/ui/partners/connect-payout-button";
import {
  Badge,
  CircleDollar,
  GreekTemple,
  StripeStablecoinIcon,
} from "@dub/ui";
import { Calendar, Globe, MapPin, Zap } from "lucide-react";
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

          <div className="grid gap-3 sm:grid-cols-2">
            <PayoutMethodCard
              title="Stablecoin"
              recommended
              icon={
                <div className="flex size-10 items-center justify-center rounded-lg border border-[#1717170D] bg-[#EDE9FE]">
                  <StripeStablecoinIcon className="size-5" />
                </div>
              }
              features={[
                { icon: <CircleDollar />, text: "Paid in USDC" },
                { icon: <Globe />, text: "Accepted worldwide" },
                { icon: <Zap />, text: "Payouts deposited instantly" },
              ]}
            />

            <PayoutMethodCard
              title="Bank Account"
              icon={
                <div className="flex size-10 items-center justify-center rounded-lg border border-[#1717171A] bg-white">
                  <GreekTemple className="text-content-emphasis size-5" />
                </div>
              }
              features={[
                { icon: <MapPin />, text: "Paid in local currency" },
                { icon: <GreekTemple />, text: "Local bank required" },
                { icon: <Calendar />, text: "Payouts deposited in days" },
              ]}
            />
          </div>
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

function PayoutMethodCard({
  icon,
  title,
  features,
  recommended,
}: {
  icon: React.ReactNode;
  title: string;
  features: { icon: React.ReactNode; text: string }[];
  recommended?: boolean;
}) {
  return (
    <div className="relative flex flex-col rounded-xl border border-neutral-200 bg-neutral-100 p-4">
      {recommended && (
        <Badge
          variant="green"
          className="absolute right-3 top-3 rounded-md font-semibold text-green-700"
        >
          Recommended
        </Badge>
      )}

      <div className="flex flex-col gap-2 text-left">
        <div>{icon}</div>
        <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
        <ul className="flex-1 space-y-2.5 text-xs font-medium text-neutral-600">
          {features.map(({ icon: featureIcon, text }) => (
            <li key={text} className="flex items-center gap-2">
              <span className="flex size-4 shrink-0 items-center justify-center text-neutral-500 [&>svg]:size-4">
                {featureIcon}
              </span>
              {text}
            </li>
          ))}
        </ul>

        <ConnectPayoutButton
          text="Connect"
          className="mt-4 h-9 w-full rounded-lg"
        />
      </div>
    </div>
  );
}
