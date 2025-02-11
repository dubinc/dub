export default function DomainCardPlaceholder() {
  return (
    <div className="grid grid-cols-[1.5fr_1fr] items-center gap-4 rounded-xl border border-neutral-200 bg-white p-5 sm:grid-cols-[3fr_1fr_1.5fr] md:grid-cols-[2fr_1fr_0.5fr_1.5fr]">
      <div className="flex items-center gap-2">
        <div className="hidden h-12 w-12 animate-pulse rounded-full bg-neutral-200 sm:block" />
        <div>
          <div className="h-6 w-32 animate-pulse rounded-md bg-neutral-200" />
          <div className="mt-2 h-4 w-48 animate-pulse rounded-md bg-neutral-200" />
        </div>
      </div>
      <div className="hidden h-6 w-24 animate-pulse rounded-md bg-neutral-200 sm:block" />
      <div className="hidden h-6 w-24 animate-pulse rounded-md bg-neutral-200 md:block" />
    </div>
  );
}
