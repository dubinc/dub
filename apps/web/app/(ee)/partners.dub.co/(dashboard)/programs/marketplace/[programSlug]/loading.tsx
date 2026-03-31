import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";

export default function MarketplaceProgramPageLoading() {
  return (
    <PageContent
      title={
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1">
            <div className="bg-bg-subtle flex size-8 shrink-0 items-center justify-center rounded-lg">
              <div className="size-4 animate-pulse rounded bg-neutral-200" />
            </div>
            <div className="size-2.5 shrink-0 animate-pulse rounded bg-neutral-200" />
          </div>
          <div className="flex min-w-0 items-center gap-1.5">
            <div className="h-7 w-32 animate-pulse rounded bg-neutral-200" />
            <div className="h-5 w-16 animate-pulse rounded bg-neutral-200" />
          </div>
        </div>
      }
      controls={
        <div className="h-9 w-20 animate-pulse rounded-lg bg-neutral-200" />
      }
    >
      <PageWidthWrapper>
        <div className="relative">
          <div className="relative mx-auto max-w-screen-md p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="size-16 animate-pulse rounded-full bg-neutral-200" />
            </div>

            <div className="mt-6 flex flex-col">
              <div className="h-9 w-64 animate-pulse rounded bg-neutral-200" />
              <div className="mt-2 flex max-w-md items-center gap-1">
                <div className="h-5 w-full animate-pulse rounded bg-neutral-200" />
              </div>
            </div>

            <div className="mt-6 flex gap-8">
              <div>
                <div className="h-3 w-16 animate-pulse rounded bg-neutral-200" />
                <div className="mt-1 flex items-center gap-1.5">
                  <div className="size-6 animate-pulse rounded-md bg-neutral-200" />
                  <div className="size-6 animate-pulse rounded-md bg-neutral-200" />
                </div>
              </div>
              <div className="min-w-0">
                <div className="h-3 w-16 animate-pulse rounded bg-neutral-200" />
                <div className="mt-1 flex items-center gap-1.5">
                  <div className="h-6 w-20 animate-pulse rounded-md bg-neutral-200" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-screen-md">
          <div className="mt-8 grid grid-cols-1 gap-5 py-6 sm:mt-8">
            <div className="h-8 w-96 animate-pulse rounded bg-neutral-200" />
            <div className="h-6 w-full max-w-md animate-pulse rounded bg-neutral-200" />
          </div>

          <div className="mt-4">
            <div className="mb-2 h-5 w-20 animate-pulse rounded bg-neutral-200" />
            <div className="h-20 w-full animate-pulse rounded-lg bg-neutral-200" />
          </div>

          <div className="mt-16 grid grid-cols-1 gap-10">
            <div className="h-64 w-full animate-pulse rounded-lg bg-neutral-200" />
            <div className="h-64 w-full animate-pulse rounded-lg bg-neutral-200" />
          </div>
        </div>
      </PageWidthWrapper>
    </PageContent>
  );
}
