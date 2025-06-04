"use client";

import { OnboardingStep } from "@/lib/onboarding/types";
import useLinks from "@/lib/swr/use-links";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button } from "@dub/ui";
import { cn } from "@dub/utils";
import Image from "next/image";
import { ReactNode, useEffect, useState } from "react";
import { LaterButton } from "../../later-button";
import { useOnboardingProgress } from "../../use-onboarding-progress";

export function DefaultDomainSelector() {
  const { loading: isWorkspaceLoading } = useWorkspace();

  return (
    <>
      <div className="animate-fade-in mx-auto grid w-full max-w-[312px] gap-4 sm:max-w-[600px] sm:grid-cols-2">
        <DomainOption
          step="domain/custom"
          icon="https://assets.dub.co/icons/link.webp"
          title="Connect a custom domain"
          description="Dedicate a domain exclusively to your short links"
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
          description="Exclusively free for one year, requiring a paid plan"
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

  const { links } = useLinks({ sort: "createdAt", pageSize: 1 });

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (links?.length) {
      try {
        const url = links[0].url;
        fetch(`/api/metatags?url=${url}`).then(async (res) => {
          if (res.ok) {
            const results = await res.json();
            setPreviewImage(results.image);
          }
        });
      } catch (_) {}
    }
  }, [links]);

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
