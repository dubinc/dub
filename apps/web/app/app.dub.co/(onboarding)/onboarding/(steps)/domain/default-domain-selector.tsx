"use client";

import { OnboardingStep } from "@/lib/onboarding/types";
import { BoltFill, Button, Crown, Icon } from "@dub/ui";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { ReactNode } from "react";
import { LaterButton } from "../../later-button";
import { useOnboardingProduct } from "../../use-onboarding-product";
import { useOnboardingProgress } from "../../use-onboarding-progress";
import { useOnboardingTrialVariant } from "../../use-onboarding-trial-variant";

export function DefaultDomainSelector() {
  const searchParams = useSearchParams();
  const { isTrialVariant } = useOnboardingTrialVariant();
  const workspaceSlug = searchParams.get("workspace");
  const product = useOnboardingProduct();

  return (
    <>
      <div className="animate-fade-in mx-auto grid w-full gap-4 sm:max-w-[600px] sm:grid-cols-2">
        {isTrialVariant && (
          <DomainOption
            step="domain/subdomain"
            icon="https://assets.dub.co/icons/gift.webp"
            title={
              <>
                Free{" "}
                <span className="rounded border border-neutral-800/10 bg-neutral-100 px-1 py-0.5 font-mono text-xs">
                  .dub.link
                </span>{" "}
                subdomain
              </>
            }
            description={
              <>
                Get a free custom domain like{" "}
                <span className="font-mono font-semibold text-neutral-900">
                  {workspaceSlug && workspaceSlug.length < 8
                    ? workspaceSlug
                    : "company"}
                  .dub.link
                </span>{" "}
                for your links.
              </>
            }
            cta="Claim .dub.link subdomain"
            bannerIcon={BoltFill}
            bannerText="Instant setup"
          />
        )}
        <DomainOption
          step="domain/custom"
          icon="https://assets.dub.co/icons/domain-sign.webp"
          title="Connect a custom domain"
          description="Already have a domain? Connect it to your Dub workspace."
          cta="Connect domain"
        />
        {!isTrialVariant && (
          <DomainOption
            step="domain/register"
            icon="https://assets.dub.co/icons/gift.webp"
            title={
              <>
                Claim a free{" "}
                <span className="rounded border border-neutral-800/10 bg-neutral-100 px-1 py-0.5 font-mono text-xs">
                  .link
                </span>{" "}
                domain
              </>
            }
            description={
              <>
                Register a domain like{" "}
                <span className="font-mono font-semibold text-neutral-900">
                  {workspaceSlug && workspaceSlug.length < 8
                    ? workspaceSlug
                    : "company"}
                  .link
                </span>{" "}
                – free for 1 year
              </>
            }
            cta="Claim .link domain"
            bannerIcon={Crown}
            bannerText="Paid plan required"
          />
        )}
      </div>
      {product === "links" && (
        <div className="mx-auto mt-8 w-full max-w-sm">
          <LaterButton next="plan" className="mt-4" />
        </div>
      )}
    </>
  );
}

function DomainOption({
  step,
  icon,
  title,
  description,
  cta,
  bannerIcon: BannerIcon,
  bannerText,
}: {
  step: OnboardingStep;
  icon: string;
  title: ReactNode;
  description: ReactNode;
  cta: string;
  bannerIcon?: Icon;
  bannerText?: string;
}) {
  const { continueTo, isLoading, isSuccessful } = useOnboardingProgress();
  return (
    <div className="relative flex h-full flex-col items-center gap-6 rounded-xl border border-neutral-300 p-6 pt-12 transition-all">
      {BannerIcon && bannerText && (
        <div className="absolute inset-x-2 top-2 flex items-center justify-center gap-2 rounded-md border border-neutral-200 bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600">
          <BannerIcon className="size-3" />
          {bannerText}
        </div>
      )}
      <div className="relative size-36">
        <Image
          src={icon}
          alt=""
          fill
          className="object-contain"
          fetchPriority="high"
        />
      </div>
      <div className="space-y-2 text-center">
        <span className="text-base font-semibold text-neutral-900">
          {title}
        </span>
        <p className="text-balance text-sm text-neutral-500">{description}</p>
      </div>
      <div className="flex w-full grow flex-col justify-end gap-2">
        <Button
          type="button"
          variant="primary"
          className="rounded-lg"
          onClick={() => continueTo(step)}
          loading={isLoading || isSuccessful}
          text={cta}
        />
      </div>
    </div>
  );
}
