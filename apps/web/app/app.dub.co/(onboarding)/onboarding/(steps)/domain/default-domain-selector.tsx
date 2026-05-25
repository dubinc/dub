"use client";

import { OnboardingStep } from "@/lib/onboarding/types";
import {
  BoltFill,
  Button,
  CircleCheckFill,
  Crown,
  CursorRays,
  Flask,
  Globe,
  type Icon,
} from "@dub/ui";
import { capitalize, cn } from "@dub/utils";
import { usePlausible } from "next-plausible";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { ReactNode } from "react";
import { LaterButton } from "../../later-button";
import { useOnboardingProduct } from "../../use-onboarding-product";
import { useOnboardingProgress } from "../../use-onboarding-progress";

export function DefaultDomainSelector() {
  const searchParams = useSearchParams();
  const workspaceSlug = searchParams.get("workspace");
  const product = useOnboardingProduct();

  return (
    <>
      <div className="animate-fade-in mx-auto grid w-full gap-4 sm:max-w-[600px] sm:grid-cols-2">
        <DomainOption
          step="domain/custom"
          icon="https://assets.dub.co/icons/domain-sign.webp"
          bannerIcon={CircleCheckFill}
          bannerText="Recommended setup"
          bannerVariant="recommended"
          title="Connect a custom domain"
          description={
            product === "links"
              ? "Already have a domain? Connect it to your Dub workspace."
              : undefined
          }
          features={
            product === "partners"
              ? [
                  {
                    icon: CursorRays,
                    text: (
                      <>
                        <a
                          href="https://dub.co/blog/custom-domains"
                          target="_blank"
                          className="underline decoration-dotted underline-offset-2 transition-colors hover:text-neutral-700"
                        >
                          Higher click-through rates
                        </a>
                      </>
                    ),
                  },
                  {
                    icon: Globe,
                    text: (
                      <>
                        Requires a{" "}
                        <a
                          href="https://dub.co/help/article/choosing-a-custom-domain"
                          target="_blank"
                          className="underline decoration-dotted underline-offset-2 transition-colors hover:text-neutral-700"
                        >
                          dedicated domain
                        </a>
                      </>
                    ),
                  },
                ]
              : undefined
          }
          cta="Connect domain"
        />
        {product === "partners" && (
          <DomainOption
            step="domain/subdomain"
            icon="https://assets.dub.co/icons/gift.webp"
            bannerIcon={BoltFill}
            bannerText="Instant setup"
            title={
              <>
                Use <DomainChip>.dub.link</DomainChip> subdomain
              </>
            }
            features={[
              {
                icon: Flask,
                text: "Best for testing purposes",
              },
              {
                icon: BoltFill,
                text: "Instant subdomain setup",
              },
            ]}
            cta="Use .dub.link subdomain"
          />
        )}
        {product === "links" && (
          <DomainOption
            step="domain/register"
            icon="https://assets.dub.co/icons/gift.webp"
            bannerIcon={Crown}
            bannerText="Paid plan required"
            title={
              <>
                Claim a free <DomainChip>.link</DomainChip> domain
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
  features,
  cta,
  bannerIcon: BannerIcon,
  bannerText,
  bannerVariant = "default",
}: {
  step: OnboardingStep;
  icon: string;
  title: ReactNode;
  description?: ReactNode;
  features?: {
    icon: Icon;
    text: ReactNode;
  }[];
  cta: string;
  bannerIcon?: Icon;
  bannerText?: string;
  bannerVariant?: "default" | "recommended";
}) {
  const plausible = usePlausible();
  const { continueTo, isLoading, isSuccessful } = useOnboardingProgress();
  return (
    <div className="relative flex h-full flex-col items-center rounded-xl border border-neutral-200 bg-white p-3 transition-all">
      <div className="relative flex h-52 w-full items-center justify-center rounded-xl bg-neutral-50">
        {BannerIcon && bannerText && (
          <div
            className={cn(
              "absolute inset-x-2 top-2 flex h-6 items-center justify-center gap-2 rounded-lg border text-xs font-semibold",
              bannerVariant === "recommended"
                ? "border-green-200 bg-green-100 text-green-700"
                : "border-neutral-200 bg-white text-neutral-700",
            )}
          >
            <BannerIcon
              className={cn(
                "size-3.5",
                bannerVariant === "recommended"
                  ? "text-green-700"
                  : "text-neutral-900",
              )}
            />
            {bannerText}
          </div>
        )}
        <div className="relative mt-8 size-32">
          <Image
            src={icon}
            alt=""
            fill
            className="object-contain"
            fetchPriority="high"
          />
        </div>
      </div>
      <div className="flex w-full flex-col p-2">
        <div className="mt-2 space-y-3 text-center">
          <span className="text-base font-semibold text-neutral-900">
            {title}
          </span>
          {description && (
            <p className="text-balance text-sm leading-snug text-neutral-500">
              {description}
            </p>
          )}
          {features && (
            <div className="mx-auto inline-flex flex-col items-start space-y-2 text-left text-sm text-neutral-500">
              {features.map(({ icon: FeatureIcon, text }, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <FeatureIcon className="size-4 shrink-0 text-neutral-500" />
                  <div>{text}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mt-6 flex w-full grow flex-col justify-end">
          <Button
            type="button"
            variant="primary"
            className="h-10 rounded-lg text-sm"
            onClick={() => {
              plausible("Selected Domain", {
                props: {
                  domainType: capitalize(step.replace("domain/", "")),
                },
              });
              continueTo(step);
            }}
            loading={isLoading || isSuccessful}
            text={cta}
          />
        </div>
      </div>
    </div>
  );
}

function DomainChip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded border border-neutral-800/10 bg-neutral-100 px-1 py-0.5 font-mono text-xs">
      {children}
    </span>
  );
}
