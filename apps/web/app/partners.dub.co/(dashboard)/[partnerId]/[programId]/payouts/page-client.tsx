"use client";

import { PageContent } from "@/ui/layout/page-content";

import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { buttonVariants, Calendar6, MaxWidthWrapper } from "@dub/ui";
import { Gear } from "@dub/ui/src/icons";
import { cn } from "@dub/utils";
import { Verified } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export function ProgramPayoutsPageClient() {
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
        <AnimatedEmptyState
          title="Payouts"
          description="Withdraw funds and view your payout history"
          cardContent={
            <>
              <Calendar6 className="size-4 text-neutral-700" />
              <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
              <div className="xs:flex hidden grow items-center justify-end gap-1.5 text-gray-500">
                <Verified className="size-3.5" />
              </div>
            </>
          }
          pillContent="Coming soon"
        />
      </MaxWidthWrapper>
    </PageContent>
  );
}
