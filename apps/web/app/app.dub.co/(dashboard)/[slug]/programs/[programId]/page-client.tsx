"use client";

import useProgram from "@/lib/swr/use-program";
import { ProgramProps } from "@/lib/types";
import { Button, buttonVariants } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import { redirect, useParams } from "next/navigation";

export default function ProgramOverviewPageClient() {
  const { slug, programId } = useParams();
  const { program } = useProgram();

  if (!program) {
    redirect(`/${slug}`);
  }

  return (
    <div className="mt-8 space-y-10">
      <div className="flex flex-col divide-y divide-neutral-200 rounded-md border border-neutral-200 bg-[#f9f9f9]">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-neutral-500">
              Sign up page
            </span>
            <span className="text-sm font-medium leading-none text-neutral-900">
              partner.dub.co/{program?.slug}
            </span>
          </div>

          <div className="flex items-center justify-between gap-5 divide-x divide-neutral-200">
            <div className="flex flex-col gap-1 text-right">
              <span className="text-xs font-medium text-neutral-500">
                Commission
              </span>
              <span className="text-sm font-medium leading-none text-neutral-900">
                {program.commissionAmount}
                {program.commissionType === "percentage" ? "%" : "$"}
              </span>
            </div>

            <div className="flex flex-col gap-1 pl-5 text-right">
              <span className="text-xs font-medium text-neutral-500">
                Cookie length
              </span>
              <span className="text-sm font-medium leading-none text-neutral-900">
                {program.cookieLength} days
              </span>
            </div>

            <div className="flex flex-col gap-1 pl-5 text-right">
              <span className="text-xs font-medium text-neutral-500">
                Min payout
              </span>
              <span className="text-sm font-medium leading-none text-neutral-900">
                ${program.minimumPayout}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center px-4 py-4">
          <div
            className="flex-1 text-sm leading-none text-neutral-900"
            dangerouslySetInnerHTML={{
              __html: commissionDescription(program),
            }}
          />
          <Button className="h-8 w-fit" text="Edit program" />
        </div>
      </div>
      <div className="flex flex-col gap-10 sm:flex-row">
        <div className="basis-1/2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-neutral-900">
              Pending partners
            </h2>

            <Link
              href={`/${slug}/programs/${programId}/partners`}
              className={cn(
                buttonVariants(),
                "flex h-8 items-center rounded-lg border px-3 text-sm",
              )}
            >
              View all
            </Link>
          </div>

          <div className="min-h-[200px] rounded-md border"></div>
        </div>
        <div className="basis-1/2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-neutral-900">
              Pending payouts
            </h2>

            <Link
              href={`/${slug}/programs/${programId}/payouts`}
              className={cn(
                buttonVariants(),
                "flex h-8 items-center rounded-lg border px-3 text-sm",
              )}
            >
              View all
            </Link>
          </div>

          <div className="min-h-[200px] rounded-md border"></div>
        </div>
      </div>
    </div>
  );
}

const commissionDescription = (program: ProgramProps) => {
  const texts = ["Earn"];

  if (program.commissionType === "flat") {
    texts.push(
      `<span class="font-semibold text-blue-600">${program.commissionAmount}</span>`,
    );
  } else {
    texts.push(
      `<span class="font-semibold text-blue-600">${program.commissionAmount}%</span>`,
    );
  }

  texts.push("for each conversion");

  if (program.recurringCommission) {
    if (program.isLifetimeRecurring) {
      texts.push(
        "and again for all future renewals throughout <span class='font-semibold'>the customer's lifetime</span>",
      );
    } else {
      texts.push(
        `and again for all renewals during the first <span class='font-semibold'>${program.recurringDuration} months</span>`,
      );
    }
  }

  return `${texts.join(" ")}.`;
};
