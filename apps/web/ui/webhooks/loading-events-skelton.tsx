export const WebhookEventListSkeleton = () => {
  return (
    <div className="rounded-xl border border-neutral-200">
      <div className="flex flex-col divide-y divide-neutral-200">
        {[...Array(5)].map((_, index) => (
          <div
            className="flex items-center justify-between gap-5 px-3.5 py-4"
            key={index}
          >
            <div className="flex items-center gap-2.5 text-neutral-500">
              <div className="h-4 w-4 animate-pulse rounded-full bg-neutral-200" />
              <div className="h-4 w-28 animate-pulse rounded-full bg-neutral-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
