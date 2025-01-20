import StripeConnectButton from "@/ui/partners/stripe-connect-button";
import { ConnectedDots4 } from "@dub/ui/icons";
import { useTranslations } from "next-intl";
import Link from "next/link";
export default function OnboardingVerification() {
  const t = useTranslations("partners.dub.co/(onboarding)/onboarding/verify");

  return (
    <div className="mx-auto my-10 flex w-full max-w-sm flex-col items-center md:mt-14">
      <div className="animate-slide-up-fade flex size-10 items-center justify-center rounded-full border border-neutral-200 bg-white backdrop-blur-sm [--offset:8px] [animation-delay:250ms] [animation-duration:1s] [animation-fill-mode:both]">
        <ConnectedDots4 className="size-5 text-neutral-900" />
      </div>
      <h1 className="animate-slide-up-fade mt-6 text-lg font-medium [--offset:8px] [animation-delay:250ms] [animation-duration:1s] [animation-fill-mode:both]">
        {t("setup-your-payouts-account")}
      </h1>
      <div className="animate-slide-up-fade mt-8 w-full [--offset:10px] [animation-delay:500ms] [animation-duration:1s] [animation-fill-mode:both]">
        <div className="divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200">
          <div className="flex items-center justify-center bg-neutral-50 p-6">
            <img
              src="https://assets.dub.co/misc/stripe-wordmark.svg"
              alt={t("stripe-wordmark")}
              className="aspect-[96/40] h-12"
            />
          </div>
          <div className="bg-white p-4 text-sm text-neutral-600">
            {t("stripe-payment-info", {
              component0: (
                <strong>{t("stripe-payment-info_component0")}</strong>
              ),
            })}
            <br />
            <br />
            {t("complete-later-warning")}
          </div>
        </div>
        <div className="mt-6 grid gap-4">
          <StripeConnectButton text={t("continue-to-stripe-button")} />
          <Link
            href="/programs"
            className="text-sm text-neutral-500 transition-colors enabled:hover:text-neutral-800"
          >
            {t("complete-later-option")}
          </Link>
        </div>
      </div>
    </div>
  );
}
