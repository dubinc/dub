import { PostbackEventListSkeleton } from "@/ui/postbacks/postback-event-list-skeleton";

export function PostbackDetailSkeleton() {
  return (
    <>
      <div className="flex justify-between gap-8 sm:items-center">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="w-fit flex-none rounded-md border border-neutral-200 bg-gradient-to-t from-neutral-100 p-2">
            <div className="size-8 animate-pulse rounded-full bg-neutral-100" />
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-5 w-28 animate-pulse rounded-full bg-neutral-100" />
            <div className="h-3 w-48 animate-pulse rounded-full bg-neutral-100" />
          </div>
        </div>
        <div className="size-8 shrink-0 animate-pulse rounded-md border border-neutral-200 bg-neutral-100" />
      </div>
      <div className="space-y-4">
        <h2 className="text-sm font-medium">Events</h2>
        <PostbackEventListSkeleton />
      </div>
    </>
  );
}
