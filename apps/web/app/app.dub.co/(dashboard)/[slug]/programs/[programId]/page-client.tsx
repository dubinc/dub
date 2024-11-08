"use client";

import useProgram from "@/lib/swr/use-program";
import { ProgramCommissionDescription } from "@/ui/programs/program-commission-description";
import { buttonVariants, Grid } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import { redirect, useParams } from "next/navigation";
import { OverviewChart } from "./overview-chart";
import { PendingPayouts } from "./pending-payouts";
import { ProgramStats } from "./program-stats";
import { TopPartners } from "./top-partners";

export default function ProgramOverviewPageClient() {
  const { slug, programId } = useParams();
  const { program } = useProgram();

  if (!program) {
    redirect(`/${slug}`);
  }

  return (
    <div className="mb-10">
      <div className="rounded-lg border border-neutral-200 bg-gray-50 p-3">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,3fr)] lg:gap-10">
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
      <div className="mt-6">
        <ProgramStats />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <TopPartners />
        <PendingPayouts />
      </div>
    </div>
  );
}
