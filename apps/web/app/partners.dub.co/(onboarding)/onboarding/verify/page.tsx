import { getSession } from "@/lib/auth";
import PaypalConnectButton from "@/ui/partners/paypal-connect-button";
import StripeConnectButton from "@/ui/partners/stripe-connect-button";
import { prisma } from "@dub/prisma";
import { CONNECT_SUPPORTED_COUNTRIES } from "@dub/utils/src/constants";
import Link from "next/link";
import { Suspense } from "react";

export default function OnboardingVerificationPage() {
  return (
    <div className="relative mx-auto my-10 flex w-full max-w-[416px] flex-col items-center md:mt-14">
      <div className="absolute inset-0 bg-white/60 [mask-composite:intersect] [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent),linear-gradient(transparent,black_10%,black_90%,transparent)]" />
      <h1 className="animate-slide-up-fade text-lg font-medium [--offset:8px] [animation-delay:250ms] [animation-duration:1s] [animation-fill-mode:both]">
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
      Button: StripeConnectButton,
    },
    paypal: {
      label: "Paypal",
      logo: "https://assets.dub.co/misc/paypal-wordmark.svg",
      Button: PaypalConnectButton,
    },
  }[provider];

  const { label, logo, Button } = providers;

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
          to setup your payouts account.
          <br />
          <br />
          You can complete this at a later date, but won't be able to collect
          any payouts until it's completed.
        </div>
      </div>
      <div className="mt-10 grid gap-4">
        <Button text="Save and continue" />

        <Link
          href="/programs"
          className="text-sm text-neutral-500 transition-colors hover:text-neutral-800"
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

  const provider = CONNECT_SUPPORTED_COUNTRIES.includes(
    partner?.country || "US",
  )
    ? "stripe"
    : "paypal";

  return <PayoutProvider provider={provider} />;
}
