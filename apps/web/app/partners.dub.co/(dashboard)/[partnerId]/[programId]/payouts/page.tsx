"use client";

import { PageContent } from "@/ui/layout/page-content";

import { buttonVariants, MaxWidthWrapper } from "@dub/ui";
import { Gear } from "@dub/ui/src/icons";
import { cn } from "@dub/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PayoutTable } from "./payout-table";

export default function ProgramPayouts() {
  const { partnerId } = useParams();

  return (
    <PageContent
      title="Payouts"
      titleControls={
        <Link
          href={`/${partnerId}/settings/payouts`}
          className={cn(
            buttonVariants({ variant: "secondary" }),
            "flex h-10 items-center gap-2 rounded-lg border px-3 text-sm",
          )}
        >
          <Gear className="size-4" />
          Settings
        </Link>
      }
    >
      <MaxWidthWrapper>
        <PayoutTable />
      </MaxWidthWrapper>
    </PageContent>
  );
}
