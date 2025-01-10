"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { X } from "@/ui/shared/icons";
import ManageSubscriptionButton from "@/ui/workspaces/manage-subscription-button";
import {
  AnimatedSizeContainer,
  Button,
  buttonVariants,
  Icon,
  useMediaQuery,
} from "@dub/ui";
import { CircleDollar, CursorRays, Hyperlink } from "@dub/ui/icons";
import {
  cn,
  getFirstAndLastDay,
  getNextPlan,
  INFINITY_NUMBER,
  nFormatter,
} from "@dub/utils";
import {
  arrow,
  autoUpdate,
  FloatingArrow,
  FloatingPortal,
  offset,
  shift,
  useFloating,
} from "@floating-ui/react";
import NumberFlow from "@number-flow/react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Play } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CSSProperties, forwardRef, useMemo, useRef, useState } from "react";

export function Usage() {
  const { slug } = useParams() as { slug?: string };

  return slug ? <UsageInner /> : null;
}

function UsageInner() {
  const { isMobile } = useMediaQuery();

  const {
    usage,
    usageLimit,
    linksUsage,
    linksLimit,
    salesUsage,
    salesLimit,
    billingCycleStart,
    plan,
    slug,
    paymentFailedAt,
    loading,
  } = useWorkspace({ swrOpts: { keepPreviousData: true } });

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

  const [hovered, setHovered] = useState(false);

  const nextPlan = getNextPlan(plan);

  // Warn the user if they're >= 90% of any limit
  const warnings = useMemo(
    () =>
      [
        [usage, usageLimit],
        [linksUsage, linksLimit],
        [salesUsage, salesLimit],
      ].map(
        ([usage, limit]) =>
          usage !== undefined &&
          limit !== undefined &&
          usage / Math.max(0, usage, limit) >= 0.9,
      ),
    [usage, usageLimit, linksUsage, linksLimit, salesUsage, salesLimit],
  );

  const warning = warnings.some((w) => w);

  const [salesRef, setSalesRef] = useState<HTMLDivElement | null>(null);
  const showConversionOnboarding =
    salesUsage === 0 && salesLimit && salesLimit > 0;

  return loading || usage !== undefined ? (
    <>
      <AnimatedSizeContainer height>
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
              icon={CursorRays}
              label="Events"
              usage={usage}
              limit={usageLimit}
              showNextPlan={hovered}
              nextPlanLimit={nextPlan?.limits.clicks}
              warning={warnings[0]}
            />
            <UsageRow
              icon={Hyperlink}
              label="Links"
              usage={linksUsage}
              limit={linksLimit}
              showNextPlan={hovered}
              nextPlanLimit={nextPlan?.limits.links}
              warning={warnings[1]}
            />
            {salesLimit && salesLimit > 0 ? (
              <UsageRow
                ref={setSalesRef}
                icon={CircleDollar}
                label="Sales"
                usage={salesUsage}
                limit={salesLimit}
                showNextPlan={hovered}
                // nextPlanLimit={nextPlan?.limits.sales}
                // TODO: Update this once we update the plan limits
                nextPlanLimit={50000}
                warning={warnings[2]}
              />
            ) : null}
          </div>

          <div className="mt-3">
            {loading ? (
              <div className="h-4 w-2/3 animate-pulse rounded-md bg-neutral-500/10" />
            ) : (
              <p
                className={cn(
                  "text-xs text-neutral-900/40",
                  paymentFailedAt && "text-red-600",
                )}
              >
                {paymentFailedAt
                  ? "Your last payment failed. Please update your payment method to continue using Dub."
                  : `Usage will reset ${billingEnd}`}
              </p>
            )}
          </div>

          {paymentFailedAt ? (
            <ManageSubscriptionButton
              text="Update Payment Method"
              variant="primary"
              className="mt-4 w-full"
              onMouseEnter={() => {
                setHovered(true);
              }}
              onMouseLeave={() => {
                setHovered(false);
              }}
            />
          ) : warning || plan === "free" ? (
            <Link
              href={`/${slug}/upgrade`}
              className={cn(
                buttonVariants(),
                "mt-4 flex h-9 items-center justify-center rounded-md border px-4 text-sm",
              )}
              onMouseEnter={() => {
                setHovered(true);
              }}
              onMouseLeave={() => {
                setHovered(false);
              }}
            >
              {plan === "free" ? "Get Dub Pro" : "Upgrade plan"}
            </Link>
          ) : null}
        </div>
      </AnimatedSizeContainer>
      {showConversionOnboarding && !isMobile && (
        <ConversionOnboardingPopup reference={salesRef} />
      )}
    </>
  ) : null;
}

type UsageRowProps = {
  icon: Icon;
  label: string;
  usage?: number;
  limit?: number;
  showNextPlan: boolean;
  nextPlanLimit?: number;
  warning: boolean;
};

const UsageRow = forwardRef<HTMLDivElement, UsageRowProps>(
  (
    {
      icon: Icon,
      label,
      usage,
      limit,
      showNextPlan,
      nextPlanLimit,
      warning,
    }: UsageRowProps,
    ref,
  ) => {
    const loading = usage === undefined || limit === undefined;
    const unlimited = limit !== undefined && limit >= INFINITY_NUMBER;

    return (
      <div ref={ref}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon className="size-3.5 text-neutral-600" />
            <span className="text-xs font-medium text-neutral-700">
              {label}
            </span>
          </div>
          {!loading ? (
            <div className="flex items-center">
              <span className="text-xs font-medium text-neutral-600">
                <NumberFlow
                  value={label === "Sales" ? usage / 100 : usage}
                  format={
                    label === "Sales"
                      ? {
                          style: "currency",
                          currency: "USD",
                          maximumFractionDigits: 0,
                        }
                      : undefined
                  }
                />{" "}
                of{" "}
                <motion.span
                  className={cn(
                    "relative transition-colors duration-150",
                    showNextPlan && nextPlanLimit
                      ? "text-neutral-400"
                      : "text-neutral-600",
                  )}
                >
                  {label === "Sales" ? "$" : ""}
                  {formatNumber(label === "Sales" ? limit / 100 : limit)}
                  {showNextPlan && nextPlanLimit && (
                    <motion.span
                      className="absolute bottom-[45%] left-0 h-[1px] bg-neutral-400"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{
                        duration: 0.25,
                        ease: "easeInOut",
                      }}
                    />
                  )}
                </motion.span>
              </span>
              <AnimatePresence>
                {showNextPlan && nextPlanLimit && (
                  <motion.div
                    className="flex items-center"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "auto", opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{
                      duration: 0.25,
                      ease: [0.4, 0, 0.2, 1], // Custom cubic-bezier for smooth movement
                    }}
                  >
                    <motion.span className="ml-1 whitespace-nowrap text-xs font-medium text-blue-600">
                      {formatNumber(nextPlanLimit)}
                    </motion.span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="h-4 w-16 animate-pulse rounded-md bg-neutral-500/10" />
          )}
        </div>
        {!unlimited && (
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
                      transform: `translateX(-${100 - Math.max(Math.floor((usage / Math.max(0, usage, limit)) * 100), usage === 0 ? 0 : 1)}%)`,
                      transition: "transform 0.25s ease-in-out",
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  },
);

const formatNumber = (value: number) =>
  value >= INFINITY_NUMBER
    ? "∞"
    : nFormatter(value, {
        full: value !== undefined && value < 99999,
        digits: 1,
      });

function ConversionOnboardingPopup({
  reference,
}: {
  reference: HTMLDivElement | null;
}) {
  const arrowRef = useRef<SVGSVGElement>(null);

  const { refs, floatingStyles, context } = useFloating({
    placement: "right-end",
    strategy: "fixed",
    whileElementsMounted(referenceEl, floatingEl, update) {
      const cleanup = autoUpdate(referenceEl, floatingEl, update, {
        // Not good for performance but keeps the arrow and floating element in the right spot
        animationFrame: true,
      });
      return cleanup;
    },
    elements: {
      reference,
    },
    middleware: [
      offset({
        mainAxis: 32,
        crossAxis: 7,
      }),
      shift({
        padding: 32,
      }),
      arrow({
        element: arrowRef,
      }),
    ],
  });

  const dismiss = () => {};

  return (
    <FloatingPortal>
      <div
        ref={refs.setFloating}
        style={floatingStyles}
        className="drop-shadow-sm"
      >
        <div className="animate-slide-up-fade relative flex w-[244px] flex-col rounded-lg border border-neutral-200 bg-white p-3 text-left">
          <div className="relative">
            <Link
              href="https://dub.co/help/article/dub-conversions"
              target="_blank"
              className="group relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-neutral-100"
            >
              {/* TODO: Add video thumbnail */}
              {/* <Image
                  src=""
                  alt="Video thumbnail"
                  fill
                  className="object-cover"
                /> */}
              <div className="relative flex size-10 items-center justify-center rounded-full bg-neutral-900 ring-[6px] ring-black/5 transition-all duration-75 group-hover:ring-[8px] group-active:ring-[7px]">
                <Play className="size-4 fill-current text-white" />
              </div>
            </Link>
            <button
              type="button"
              onClick={dismiss}
              className="absolute right-2 top-2 rounded-md border border-neutral-200 bg-white p-1.5 shadow-sm transition-colors duration-75 hover:bg-neutral-50"
            >
              <X className="size-4 text-neutral-500" />
            </button>
          </div>
          <h2 className="mt-4 text-sm font-semibold text-neutral-700">
            Conversion tracking unlocked
          </h2>
          <p className="mt-1.5 text-xs text-neutral-500">
            Follow our guides to get set up and track your short link
            conversions
          </p>
          <div className="mt-4 grid w-full grid-cols-2 gap-2">
            <Button
              type="button"
              variant="secondary"
              className="h-7 text-xs"
              text="Maybe later"
              onClick={dismiss}
            />
            <Link
              href={`https://dub.co/help/article/dub-conversions`}
              target="_blank"
              className={cn(
                buttonVariants({ variant: "primary" }),
                "flex h-7 items-center justify-center whitespace-nowrap rounded-lg border px-3 text-sm text-xs",
              )}
            >
              View guides
            </Link>
          </div>
          <FloatingArrow
            ref={arrowRef}
            context={context}
            className="stroke-neutral-200"
            fill="white"
            strokeWidth={1}
            height={10}
          />
        </div>
      </div>
    </FloatingPortal>
  );
}
