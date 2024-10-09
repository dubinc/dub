"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { AnimatedSizeContainer, Icon } from "@dub/ui";
import { buttonVariants } from "@dub/ui/src/button";
import { CursorRays, Hyperlink } from "@dub/ui/src/icons";
import { cn, getFirstAndLastDay, nFormatter } from "@dub/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CSSProperties, useMemo } from "react";

export function Usage() {
  const { slug } = useParams() as { slug?: string };

  return slug ? <UsageInner /> : null;
}

function UsageInner() {
  const {
    usage,
    usageLimit,
    linksUsage,
    linksLimit,
    billingCycleStart,
    plan,
    slug,
    loading,
  } = useWorkspace();

  const [billingEnd] = useMemo(() => {
    if (billingCycleStart) {
      const { lastDay } = getFirstAndLastDay(billingCycleStart);
      const end = lastDay.toLocaleDateString("en-us", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      return [end];
    }
    return [];
  }, [billingCycleStart]);

  // Warn the user if they're >= 90% of any limit
  const warnings = useMemo(
    () =>
      [
        [usage, usageLimit],
        [linksUsage, linksLimit],
      ].map(
        ([usage, limit]) =>
          usage !== undefined &&
          limit !== undefined &&
          usage / Math.max(0, usage, limit) >= 0.9,
      ),
    [usage, usageLimit, linksUsage, linksLimit],
  );

  const warning = warnings.some((w) => w);

  return loading || usage !== undefined ? (
    <div className="border-t border-neutral-300/80 p-3">
      <Link
        className="group flex items-center gap-0.5 text-sm font-normal text-neutral-500 transition-colors hover:text-neutral-700"
        href={`/${slug}/settings/billing`}
      >
        Usage
        <ChevronRight className="size-3 text-neutral-400 transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-neutral-500" />
      </Link>

      <div className="mt-4 flex flex-col gap-4">
        <UsageRow
          icon={Hyperlink}
          label="Links"
          usage={linksUsage}
          limit={linksLimit}
          warning={warnings[1]}
        />
        <UsageRow
          icon={CursorRays}
          label="Events"
          usage={usage}
          limit={usageLimit}
          warning={warnings[0]}
        />
      </div>

      <div className="mt-3">
        {billingEnd ? (
          <p className="text-xs text-neutral-900/40">
            Usage will reset {billingEnd}
          </p>
        ) : loading ? (
          <div className="h-4 w-2/3 animate-pulse rounded-md bg-neutral-500/10" />
        ) : (
          <div className="h-4" />
        )}
      </div>

      <AnimatedSizeContainer height>
        {warning && (
          <div className="pt-4">
            <Link
              href={`/${slug}/upgrade`}
              className={cn(
                buttonVariants(),
                "flex h-9 items-center justify-center rounded-md border px-4 text-sm",
              )}
            >
              {plan === "free" ? "Get Dub Pro" : "Upgrade plan"}
            </Link>
          </div>
        )}
      </AnimatedSizeContainer>
    </div>
  ) : null;
}

function UsageRow({
  icon: Icon,
  label,
  usage,
  limit,
  warning,
}: {
  icon: Icon;
  label: string;
  usage?: number;
  limit?: number;
  warning: boolean;
}) {
  const loading = usage === undefined || limit === undefined;

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="size-3.5 text-neutral-600" />
          <span className="text-xs font-medium text-neutral-700">{label}</span>
        </div>
        {!loading ? (
          <span className="text-xs font-medium text-neutral-600">
            {formatNumber(usage)} of {formatNumber(limit)}
          </span>
        ) : (
          <div className="h-4 w-16 animate-pulse rounded-md bg-neutral-500/10" />
        )}
      </div>
      <div className="mt-1.5">
        <div
          className={cn(
            "h-0.5 w-full overflow-hidden rounded-full bg-neutral-900/10 transition-colors",
            loading && "bg-neutral-900/5",
          )}
        >
          {!loading && (
            <div
              className="animate-slide-right-fade size-full"
              style={{ "--offset": "-100%" } as CSSProperties}
            >
              <div
                className={cn(
                  "size-full rounded-full bg-gradient-to-r from-transparent to-blue-600",
                  warning && "to-rose-500",
                )}
                style={{
                  transform: `translateX(-${100 - (usage / Math.max(0, usage, limit)) * 100}%)`,
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const formatNumber = (value: number) =>
  isFinite(value)
    ? nFormatter(value, { full: value !== undefined && value < 9999 })
    : "∞";
