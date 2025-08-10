import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ChevronRight } from "@dub/ui";
import { Trophy } from "lucide-react";

export default function Page() {
  return (
    <PageContent
      title={
        <div className="flex items-center gap-1">
          <div className="flex items-center justify-center rounded-lg bg-neutral-100 p-2">
            <Trophy className="size-4" />
          </div>
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
        <></>
      </PageWidthWrapper>
    </PageContent>
  );
}
