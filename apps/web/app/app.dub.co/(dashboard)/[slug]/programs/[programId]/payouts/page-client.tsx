"use client";

import { PageContent } from "@/ui/layout/page-content";
import { buttonVariants, MaxWidthWrapper } from "@dub/ui";
import { Gear } from "@dub/ui/src/icons";
import { cn } from "@dub/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CreatePayoutButton } from "./create-payout-button";
import { PayoutStats } from "./payout-stats";
import { PayoutTable } from "./payout-table";

export function ProgramPayoutsPageClient() {
  const { slug } = useParams() as { slug: string };

  return (
    <PageContent
      title="Payouts"
      titleControls={
        <div className="flex items-center gap-2">
          <CreatePayoutButton />

          <Link
            href={`/${slug}/settings/payouts`}
            className={cn(
              buttonVariants({ variant: "secondary" }),
              "flex h-10 items-center gap-2 rounded-lg border px-3 text-sm",
            )}
          >
            <Gear className="size-4" />
          </Link>
        </div>
      }
    >
      <MaxWidthWrapper>
        <PayoutStats />
        <div className="mt-6">
          <PayoutTable />
        </div>
      </MaxWidthWrapper>
    </PageContent>
  );
}
