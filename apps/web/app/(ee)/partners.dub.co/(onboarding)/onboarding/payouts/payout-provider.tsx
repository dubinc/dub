"use client";

import { ConnectPayoutButton } from "@/ui/partners/connect-payout-button";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function PayoutProvider({
  provider,
}: {
  provider: "stripe" | "paypal";
}) {
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const providers = {
    stripe: {
      label: "Stripe",
      logo: "https://assets.dub.co/misc/stripe-wordmark.svg",
    },
    paypal: {
      label: "Paypal",
      logo: "https://assets.dub.co/misc/paypal-wordmark.svg",
    },
  }[provider];

  const { label, logo } = providers;

  return (
    <>
      <div className="divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200">
        <div className="flex items-center justify-center bg-neutral-50 p-4">
          <img
            src={logo}
            alt={`${label} wordmark`}
            className="aspect-[96/40] h-10"
          />
        </div>
        <div className="bg-white px-6 py-4 text-sm text-neutral-600">
          We use {label} to ensure you get paid on time and to keep your
          personal bank details secure. Click <strong>Connect payouts</strong>{" "}
          to connect your bank account.
          <br />
          <br />
          You can complete this at a later date, but won't be able to collect
          any payouts until it's completed.
          <br />
          <br />
          <a
            href="https://dub.co/help/article/receiving-payouts"
            target="_blank"
            className="cursor-help text-sm text-neutral-500 underline decoration-dotted underline-offset-2 transition-colors hover:text-neutral-800"
          >
            Learn more about receiving payouts on Dub.
          </a>
        </div>
      </div>
      <div className="mt-10 grid gap-4">
        <ConnectPayoutButton text="Connect payouts" />

        <Link
          href={next ?? "/programs"}
          className="text-sm font-medium text-neutral-800 transition-colors hover:text-neutral-950"
        >
          I'll complete this later
        </Link>
      </div>
    </>
  );
}
