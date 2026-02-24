import { getSession } from "@/lib/auth";
import { getPartnerPayoutMethods } from "@/lib/payouts/api/get-partner-payout-methods";
import { PayoutMethodSelector } from "@/ui/partners/payouts/payout-method-cards";
import { prisma } from "@dub/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default function OnboardingVerificationPage() {
  return (
    <div className="relative mx-auto my-10 flex w-full max-w-[600px] flex-col items-center px-4 text-center sm:px-6 md:mt-6">
      <h1 className="animate-slide-up-fade text-content-emphasis text-xl font-semibold [--offset:8px] [animation-delay:250ms] [animation-duration:1s] [animation-fill-mode:both]">
        Payout information
      </h1>
      <p className="animate-slide-up-fade mt-1 text-base font-medium text-neutral-500 [--offset:8px] [animation-delay:250ms] [animation-duration:1s] [animation-fill-mode:both]">
        Connect your preferred payout method to receive payments.
      </p>
      <div className="animate-slide-up-fade relative mt-12 w-full [--offset:10px] [animation-delay:500ms] [animation-duration:1s] [animation-fill-mode:both]">
        <Suspense fallback={<PayoutSkeleton />}>
          <PayoutRSC />
        </Suspense>
      </div>
    </div>
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
    select: {
      id: true,
      country: true,
      stripeConnectId: true,
      stripeRecipientId: true,
      paypalEmail: true,
      defaultPayoutMethod: true,
    },
  });

  if (!partner?.country) {
    redirect("/");
  }

  const payoutMethods = await getPartnerPayoutMethods(partner);

  if (payoutMethods.length === 0) {
    redirect("/");
  }

  return (
    <>
      <PayoutMethodSelector
        payoutMethods={payoutMethods}
        allowConnectWhenPayoutsEnabled
      />
      <Link
        href="/programs"
        className="mt-6 block text-center text-sm font-semibold text-neutral-800 transition-colors hover:text-neutral-950"
      >
        I'll complete this later
      </Link>
    </>
  );
}
