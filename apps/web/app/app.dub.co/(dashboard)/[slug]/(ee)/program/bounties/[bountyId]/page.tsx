import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ChevronRight } from "@dub/ui";
import { Trophy } from "lucide-react";
import Link from "next/link";
import { BountyInfo } from "./bounty-info";
import { BountySubmissionsTable } from "./bounty-submissions-table";

export default function Page({ params }: { params: { slug: string } }) {
  const { slug } = params;

  return (
    <PageContent
      title={
        <div className="flex items-center gap-1">
          <Link
            href={`/${slug}/program/bounties`}
            aria-label="Back to bounties"
            title="Back to bounties"
            className="bg-bg-subtle hover:bg-bg-emphasis flex size-8 shrink-0 items-center justify-center rounded-lg transition-[transform,background-color] duration-150 active:scale-95"
          >
            <Trophy className="size-4" />
          </Link>

          <div className="flex items-center gap-1.5">
            <ChevronRight className="text-content-subtle size-2.5 shrink-0 [&_*]:stroke-2" />
            <span className="text-lg font-semibold leading-7 text-neutral-900">
              Bounty details
            </span>
          </div>
        </div>
      }
    >
      <PageWidthWrapper>
        <div className="flex flex-col gap-4">
          <BountyInfo />
          <BountySubmissionsTable />
        </div>
      </PageWidthWrapper>
    </PageContent>
  );
}
