"use client";

import useProgram from "@/lib/swr/use-program";
import { ProgramProps } from "@/lib/types";
import { buttonVariants } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import { redirect, useParams } from "next/navigation";
import { OverviewChart } from "./overview-chart";

export default function ProgramOverviewPageClient() {
  const { slug, programId } = useParams();
  const { program } = useProgram();

  if (!program) {
    redirect(`/${slug}`);
  }

  return (
    <div className="space-y-10">
      <div className="rounded-lg border border-neutral-200 bg-gray-50 p-3">
        <div className="grid gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,3fr)] md:gap-10">
          <OverviewChart />
          <div className="flex flex-col rounded-lg bg-neutral-800 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-neutral-50">
                Program
              </h3>
              <Link
                href={`/${slug}/programs/${programId}/settings`}
                className={cn(
                  buttonVariants({ variant: "secondary" }),
                  "flex h-7 items-center rounded-md border px-2 text-sm",
                )}
              >
                Edit Program
              </Link>
            </div>
            <div className="mt-6 flex grow flex-col justify-end">
              <p
                className="text-xl text-white"
                dangerouslySetInnerHTML={{
                  __html: commissionDescription(program),
                }}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-10 sm:flex-row">
        <div className="basis-1/2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-neutral-900">
              Top partners
            </h2>

            <Link
              href={`/${slug}/programs/${programId}/partners?sort=earnings&sortBy=desc`}
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
  const texts = ["Earn "];

  if (program.commissionType === "flat") {
    texts.push(
      `<span class="font-medium text-blue-400">${program.commissionAmount}</span>`,
    );
  } else {
    texts.push(
      `<span class="font-medium text-blue-400">${program.commissionAmount}%</span>`,
    );
  }

  texts.push(" for each conversion");

  if (program.recurringCommission) {
    if (program.isLifetimeRecurring) {
      texts.push(
        ", and again for all future renewals throughout <span class='font-medium'>the customer's lifetime</span>",
      );
    } else {
      texts.push(
        `, and again for all renewals during the first <span class='font-medium'>${program.recurringDuration} months</span>`,
      );
    }
  }

  return `${texts.join("")}.`;
};
