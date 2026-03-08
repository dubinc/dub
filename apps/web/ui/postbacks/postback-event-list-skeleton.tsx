export const PostbackEventListSkeleton = () => {
  return (
    <div className="overflow-hidden rounded-md border border-neutral-200">
      <div className="flex flex-col divide-y divide-neutral-200">
        {[...Array(5)].map((_, index) => (
          <div
            className="flex items-center justify-between gap-5 px-3.5 py-3"
            key={index}
          >
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2.5">
                <div className="h-4 w-4 animate-pulse rounded-full bg-neutral-200" />
                <div className="h-4 w-12 animate-pulse rounded-full bg-neutral-200" />
              </div>
              <div className="h-4 w-24 animate-pulse rounded-full bg-neutral-200" />
            </div>
            <div className="h-3 w-20 animate-pulse rounded-full bg-neutral-200" />
          </div>
        ))}
      </div>
    </div>
  );
};
