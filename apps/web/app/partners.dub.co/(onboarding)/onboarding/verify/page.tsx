import StripeConnectButton from "@/ui/partners/stripe-connect-button";
import Link from "next/link";
export default function OnboardingVerification() {
  return (
    <div className="relative mx-auto my-10 flex w-full max-w-[416px] flex-col items-center md:mt-14">
      <div className="absolute inset-0 bg-white/60 [mask-composite:intersect] [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent),linear-gradient(transparent,black_10%,black_90%,transparent)]" />
      <h1 className="animate-slide-up-fade text-lg font-medium [--offset:8px] [animation-delay:250ms] [animation-duration:1s] [animation-fill-mode:both]">
        Payout information
      </h1>
      <div className="animate-slide-up-fade relative mt-8 w-full [--offset:10px] [animation-delay:500ms] [animation-duration:1s] [animation-fill-mode:both]">
        <div className="divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200">
          <div className="flex items-center justify-center bg-neutral-50 p-4">
            <img
              src="https://assets.dub.co/misc/stripe-wordmark.svg"
              alt="Stripe wordmark"
              className="aspect-[96/40] h-10"
            />
          </div>
          <div className="bg-white px-6 py-4 text-sm text-neutral-600">
            We use Stripe to ensure you get paid on time and to keep your
            personal bank details secure. Click{" "}
            <strong>Save and continue</strong> to setup your payouts account.
            <br />
            <br />
            You can complete this at a later date, but won't be able to collect
            any payouts until it's completed.
          </div>
        </div>
        <div className="mt-10 grid gap-4">
          <StripeConnectButton text="Save and continue" />
          <Link
            href="/programs"
            className="text-sm text-neutral-500 transition-colors hover:text-neutral-800"
          >
            I'll complete this later
          </Link>
        </div>
      </div>
    </div>
  );
}
