import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ChevronRight, PaperPlane } from "@dub/ui";

const labelClassName = "text-sm font-medium text-content-muted";

export function CampaignEditorSkeleton() {
  return (
    <PageContent
      title={
        <div className="flex items-center gap-1.5">
          <div className="bg-bg-subtle flex size-8 shrink-0 items-center justify-center rounded-lg">
            <PaperPlane className="text-content-default size-4" />
          </div>
          <ChevronRight className="text-content-muted size-2.5 shrink-0 [&_*]:stroke-2" />
          <div className="h-6 w-32 animate-pulse rounded-md bg-neutral-200" />
        </div>
      }
      controls={
        <div className="flex items-center gap-2">
          <div className="h-9 w-20 animate-pulse rounded-md bg-neutral-200" />
          <div className="h-8 w-8 animate-pulse rounded-md bg-neutral-200" />
        </div>
      }
    >
      <PageWidthWrapper className="mb-8 max-w-[600px]">
        <div className="grid grid-cols-[max-content_minmax(0,1fr)] items-center gap-x-6 gap-y-2">
          <span className={labelClassName}>Name</span>
          <div className="h-7 w-full animate-pulse rounded-md bg-neutral-100" />

          <span className={labelClassName}>To</span>
          <div className="h-7 w-full animate-pulse rounded-md bg-neutral-100" />

          <span className={labelClassName}>Subject</span>
          <div className="h-7 w-full animate-pulse rounded-md bg-neutral-100" />

          <span className={labelClassName}>Automation</span>
          <div className="h-7 w-full animate-pulse rounded-md bg-neutral-100" />
        </div>

        <div className="mt-6">
          <div className="min-h-[400px] animate-pulse rounded-md bg-neutral-100" />
        </div>
      </PageWidthWrapper>
    </PageContent>
  );
}
