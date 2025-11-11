"use client";

import useProgram from "@/lib/swr/use-program";
import LayoutLoader from "@/ui/layout/layout-loader";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { X } from "@/ui/shared/icons";
import { buttonVariants, CircleCheckFill, Grid, Receipt2 } from "@dub/ui";
import {
  cn,
  currencyFormatter,
  DUB_LOGO,
  fetcher,
  pluralize,
} from "@dub/utils";
import { Invoice } from "@prisma/client";
import Confetti from "canvas-confetti";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";

export function PayoutsSuccessPageClient() {
  const { slug } = useParams();
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get("invoiceId");

  const [isCountLoaded, setIsCountLoaded] = useState(false);

  const { data: invoice, isLoading } = useSWR<
    Invoice & { _count: { payouts: number } }
  >(
    invoiceId && `/api/workspaces/${slug}/billing/invoices/${invoiceId}`,
    fetcher,
    // Keep refreshing if the count hasn't been updated yet
    { refreshInterval: !isCountLoaded ? 1000 : undefined },
  );

  useEffect(() => {
    if (invoice?._count.payouts) setIsCountLoaded(true);
  }, [invoice?._count.payouts]);

  const { program } = useProgram();

  useEffect(() => {
    if (isLoading || !program || !invoice) return;

    [0.25, 0.5, 0.75].forEach((x) =>
      Confetti({
        particleCount: 50,
        startVelocity: 90,
        spread: 90,
        ticks: 1000,
        origin: { x, y: 0 },
        disableForReducedMotion: true,
      }),
    );

    return () => Confetti.reset();
  }, [isLoading, program, invoice]);

  if (isLoading || !program) {
    return <LayoutLoader />;
  }

  if (!invoice) {
    return (
      <div className="flex min-h-[calc(100vh-10rem)] flex-col items-center justify-center px-4 py-10">
        <AnimatedEmptyState
          title="Invoice not found"
          description="The invoice you're looking for doesn't exist."
          cardContent={() => (
            <>
              <Receipt2 className="size-4 text-neutral-700" />
              <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
            </>
          )}
          className="border-none"
          learnMoreText="Back to payouts"
          learnMoreHref={`/${slug}/program/payouts?status=pending&sortBy=amount`}
          learnMoreTarget="_self"
        />
      </div>
    );
  }

  // Convert total from cents to dollars
  const amountPaid = currencyFormatter(invoice.amount);

  // this can be zero in the beginning, so maybe we can add a loading state for the partner count,
  // while we keep calling mutate() for the invoice SWR above?
  // e.g. something like a NumberFlow animation could work – for consistency we should do the same for amountPaid as well
  const partnerCount = invoice._count.payouts;

  return (
    <div className="rounded-t-[inherit] bg-white">
      <div className="flex justify-end pr-2 pt-2">
        <Link
          href={`/${slug}/program/payouts?status=pending&sortBy=amount`}
          className={cn(
            "flex size-8 items-center justify-center whitespace-nowrap rounded-lg border p-0 text-base",
            buttonVariants({ variant: "outline" }),
          )}
        >
          <X className="text-content-default size-4" />
        </Link>
      </div>
      <div className="flex min-h-[calc(100vh-10rem)] flex-col items-center justify-center px-4 py-10">
        <div
          className={cn(
            "flex flex-col items-center text-center",
            "animate-slide-up-fade motion-reduce:animate-fade-in [--offset:10px] [animation-duration:0.5s] [animation-fill-mode:both]",
          )}
        >
          <CircleCheckFill className="size-8 text-green-600" />
          <h2 className="text-content-default mt-4 text-lg font-semibold">
            Thank you for your payout!
          </h2>
          <p className="text-content-subtle text-base font-medium">
            You've paid out {amountPaid} to your{" "}
            {pluralize("partner", partnerCount)}.
          </p>
        </div>

        <div
          className={cn(
            "border-border-subtle relative mt-8 w-full max-w-[400px] rounded-2xl border bg-neutral-50 text-center",
            "animate-slide-up-fade motion-reduce:animate-fade-in [--offset:20px] [animation-delay:100ms] [animation-duration:0.5s] [animation-fill-mode:both]",
          )}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
            <div className="absolute inset-y-0 left-1/2 w-[640px] -translate-x-1/2 [mask-image:linear-gradient(black,transparent_280px)]">
              <Grid
                cellSize={35}
                patternOffset={[-29, -10]}
                className="text-border-subtle"
              />
            </div>
          </div>

          <div className="relative flex flex-col items-center p-6 pt-10">
            <img
              src={program.logo ?? DUB_LOGO}
              alt={program.name}
              className="size-16 rounded-full"
            />
            <span className="text-content-emphasis mt-6 text-2xl font-semibold">
              {program.name}
            </span>
            <span className="text-content-subtle text-base font-medium">
              # {invoice.number}
            </span>

            {/* Stats */}
            <div className="divide-border-subtle mt-6 grid w-full grid-cols-2 divide-x rounded-xl bg-white px-2 py-3">
              {[
                { value: amountPaid, label: "Paid" },
                {
                  value: partnerCount,
                  loading: !isCountLoaded,
                  label: pluralize("Partner", partnerCount),
                },
              ].map(({ value, label, loading }) => (
                <div
                  key={label}
                  className="flex flex-col items-center px-2 text-center"
                >
                  <span className="text-content-default text-xl font-semibold">
                    {loading ? (
                      <span className="block h-7 w-8 animate-pulse rounded-md bg-neutral-200" />
                    ) : (
                      value
                    )}
                  </span>
                  <span className="text-content-subtle text-base font-medium">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Divider + inserts */}
          <div className="bg-border-subtle pointer-events-none relative mt-2 h-px w-full">
            <div className="border-border-subtle absolute -top-4 left-[-17px] size-8 rounded-full border bg-white [mask-image:linear-gradient(90deg,transparent_50%,black_50%)]" />
            <div className="border-border-subtle absolute -top-4 right-[-17px] size-8 rounded-full border bg-white [mask-image:linear-gradient(90deg,black_50%,transparent_50%)]" />
          </div>

          <div className="relative p-6">
            <Link
              href={`/${slug}/settings/billing/invoices?type=partnerPayout`}
              className={cn(
                "flex h-9 w-full items-center justify-center whitespace-nowrap rounded-lg border px-5 text-sm",
                buttonVariants({ variant: "primary" }),
              )}
            >
              View invoices
            </Link>
          </div>
        </div>

        <div
          className={cn(
            "mt-8",
            "animate-slide-up-fade motion-reduce:animate-fade-in [--offset:10px] [animation-delay:200ms] [animation-duration:0.5s] [animation-fill-mode:both]",
          )}
        >
          <Link
            href={`/${slug}/program`}
            className={cn(
              "flex h-9 w-fit items-center justify-center whitespace-nowrap rounded-lg border px-4 text-sm",
              buttonVariants({ variant: "secondary" }),
            )}
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
