"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { buttonVariants, Crown } from "@dub/ui";
import { capitalize, cn } from "@dub/utils";
import Link from "next/link";

export const UpgradeRequiredToast = ({
  title,
  planToUpgradeTo,
  message,
  ctaLabel,
  ctaUrl,
}: {
  title?: string;
  planToUpgradeTo?: string;
  message: string;
  ctaLabel?: string;
  ctaUrl?: string;
}) => {
  const { slug, nextPlan } = useWorkspace();
  planToUpgradeTo = planToUpgradeTo || nextPlan?.name;

  const defaultCtaLabel = planToUpgradeTo
    ? `Upgrade to ${capitalize(planToUpgradeTo)}`
    : "Contact support";

  const defaultCtaUrl = slug ? `/${slug}/upgrade` : "https://dub.co/pricing";
  const href = ctaUrl || defaultCtaUrl;
  const isExternal = href.startsWith("http");

  return (
    <div className="flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-[0_4px_12px_#0000001a]">
      <div className="flex gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-100">
          <Crown className="size-4 text-neutral-700" />
        </div>
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-semibold leading-5 text-neutral-900">
            {title ||
              `You've discovered a ${capitalize(planToUpgradeTo)} feature!`}
          </p>
          <p className="text-[13px] leading-snug text-neutral-500">
            {message}
          </p>
        </div>
      </div>
      <Link
        href={href}
        {...(isExternal
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
        className={cn(
          buttonVariants({ variant: "primary" }),
          "flex h-8 w-full items-center justify-center whitespace-nowrap rounded-lg border px-4 text-sm",
        )}
      >
        {ctaLabel || defaultCtaLabel}
      </Link>
    </div>
  );
};
