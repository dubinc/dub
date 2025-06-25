"use client";

import { OnboardingStep } from "@/lib/onboarding/types";
import { Button } from "@dub/ui";
import { cn } from "@dub/utils";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { ReactNode } from "react";
import { LaterButton } from "../../later-button";
import { useOnboardingProgress } from "../../use-onboarding-progress";

export function DefaultDomainSelector() {
  const searchParams = useSearchParams();
  const workspaceSlug = searchParams.get("workspace");

  return (
    <>
      <div className="animate-fade-in mx-auto grid w-full max-w-[312px] gap-4 sm:max-w-[600px] sm:grid-cols-2">
        <DomainOption
          step="domain/custom"
          icon="https://assets.dub.co/icons/link.webp"
          title="Connect a custom domain"
          description="Already have a domain? Connect it to Dub in just a few clicks"
          cta="Connect domain"
        />
        <DomainOption
          step="domain/register"
          icon="https://assets.dub.co/icons/crown.webp"
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
        />
      </div>
      <div className="mx-auto mt-8 w-full max-w-sm">
        <LaterButton next="invite" className="mt-4" />
      </div>
    </>
  );
}

function DomainOption({
  step,
  icon,
  title,
  description,
  cta,
}: {
  step: OnboardingStep;
  icon: string;
  title: ReactNode;
  description: ReactNode;
  cta: string;
}) {
  const { continueTo, isLoading, isSuccessful } = useOnboardingProgress();
  return (
    <div
      className={cn(
        "relative flex h-full flex-col items-center gap-6 rounded-xl border border-neutral-300 p-8 pt-10 transition-all",
      )}
    >
      <div className="relative size-36">
        <Image
          src={icon}
          alt=""
          fill
          className="object-contain"
          fetchPriority="high"
        />
      </div>
      <div className="space-y-2 text-center text-sm">
        <span className="font-semibold text-neutral-900">{title}</span>
        <p className="text-neutral-500">{description}</p>
      </div>
      <div className="flex w-full grow flex-col justify-end gap-2">
        <Button
          type="button"
          variant="primary"
          onClick={() => continueTo(step)}
          loading={isLoading || isSuccessful}
          text={cta}
        />
      </div>
    </div>
  );
}
