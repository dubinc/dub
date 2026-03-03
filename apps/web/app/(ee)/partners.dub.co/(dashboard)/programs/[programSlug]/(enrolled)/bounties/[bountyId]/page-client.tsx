"use client";

import usePartnerBounty from "@/lib/swr/use-partner-bounty";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ChevronRight, Trophy } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import { redirect, useParams } from "next/navigation";

export function PartnerBountyPageClient() {
  const { programSlug } = useParams<{ programSlug: string }>();
  const { bounty, isLoading } = usePartnerBounty();

  if (!bounty && !isLoading) {
    redirect(`/programs/${programSlug}/bounties`);
  }

  return (
    <PageWidthWrapper className="flex flex-col gap-6 pb-10">
      <div className="@3xl/page:grid-cols-[minmax(440px,1fr)_minmax(0,360px)] grid grid-cols-1 gap-6">
        <div />
        <div />
      </div>
    </PageWidthWrapper>
  );
}

export function PartnerBountyPageHeaderTitle() {
  const { programSlug } = useParams<{ programSlug: string }>();
  const { bounty } = usePartnerBounty();

  return (
    <div className="flex items-center gap-1.5">
      <Link
        href={`/programs/${programSlug}/bounties`}
        aria-label="Back to bounties"
        title="Back to bounties"
        className={cn(
          "bg-bg-subtle flex size-8 shrink-0 items-center justify-center rounded-lg",
          "hover:bg-bg-emphasis transition-[transform,background-color] duration-150 active:scale-95",
        )}
      >
        <Trophy className="size-4" />
      </Link>
      <ChevronRight className="text-content-muted size-2.5 shrink-0 [&_*]:stroke-2" />
      <div>
        {bounty ? (
          bounty.name
        ) : (
          <div className="h-6 w-48 animate-pulse rounded-md bg-neutral-200" />
        )}
      </div>
    </div>
  );
}
