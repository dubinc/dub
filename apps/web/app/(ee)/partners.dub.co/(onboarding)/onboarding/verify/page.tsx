import { getSession } from "@/lib/auth";
import { ConnectPayoutButton } from "@/ui/partners/connect-payout-button";
import { prisma } from "@dub/prisma";
import {
  CONNECT_SUPPORTED_COUNTRIES,
  PAYPAL_SUPPORTED_COUNTRIES,
} from "@dub/utils";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default function OnboardingVerificationPage() {
  return (
    <div className="relative mx-auto my-10 flex w-full max-w-[416px] flex-col items-center text-center md:mt-6">
      <h1 className="animate-slide-up-fade text-content-emphasis text-lg font-medium [--offset:8px] [animation-delay:250ms] [animation-duration:1s] [animation-fill-mode:both]">
        Payout information
      </h1>
      <div className="animate-slide-up-fade relative mt-8 w-full [--offset:10px] [animation-delay:500ms] [animation-duration:1s] [animation-fill-mode:both]">
        <Suspense fallback={<PayoutSkeleton />}>
          <PayoutRSC />
        </Suspense>
      </div>
    </div>
  );
}

function PayoutProvider({ provider }: { provider: "stripe" | "paypal" }) {
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
          personal bank details secure. Click <strong>Save and continue</strong>{" "}
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
        <ConnectPayoutButton text="Save and continue" />

        <Link
          href="/programs"
          className="text-sm font-medium text-neutral-800 transition-colors hover:text-neutral-950"
        >
          I'll complete this later
        </Link>
      </div>
    </>
  );
}

function PayoutSkeleton() {
  return (
    <>
      <div className="divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200">
        <div className="flex items-center justify-center bg-neutral-50 p-4">
          <div className="h-10 w-24 animate-pulse rounded bg-neutral-200" />
        </div>
        <div className="bg-white px-6 py-4">
          <div className="space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-neutral-200" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-200" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-neutral-200" />
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-neutral-200" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-200" />
          </div>
        </div>
      </div>
      <div className="mt-10 flex flex-col items-center gap-4">
        <div className="h-10 w-full animate-pulse rounded-md bg-black" />
        <div className="h-4 w-32 animate-pulse rounded bg-neutral-200" />
      </div>
    </>
  );
}

async function PayoutRSC() {
  const { user } = await getSession();
  const partner = await prisma.partner.findUnique({
    where: {
      email: user.email,
    },
  });
  if (!partner?.country) {
    redirect("/");
  }

  const provider = CONNECT_SUPPORTED_COUNTRIES.includes(partner.country)
    ? "stripe"
    : PAYPAL_SUPPORTED_COUNTRIES.includes(partner.country)
      ? "paypal"
      : null;

  if (!provider) {
    redirect("/");
  }

  return <PayoutProvider provider={provider} />;
}
