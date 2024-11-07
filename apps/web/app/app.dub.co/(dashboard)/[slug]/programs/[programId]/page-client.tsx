"use client";

import useProgram from "@/lib/swr/use-program";
import { ProgramCommissionDescription } from "@/ui/programs/program-commission-description";
import { buttonVariants, Grid } from "@dub/ui";
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
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,3fr)] md:gap-10">
          <OverviewChart />
          <div className="relative flex flex-col overflow-hidden rounded-lg bg-neutral-800">
            <Grid className="text-white/5" cellSize={20} />
            <div className="relative flex items-center justify-between p-5">
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
            <div className="relative flex grow flex-col justify-end">
              <div className="relative p-5 pt-10">
                <div className="absolute inset-0 bg-neutral-800 [mask-image:linear-gradient(to_bottom,transparent,black_30%)]" />
                <p className="relative text-xl text-white">
                  <ProgramCommissionDescription
                    program={program}
                    amountClassName="text-blue-400 font-medium"
                    periodClassName="text-white font-medium"
                  />
                </p>
              </div>
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
