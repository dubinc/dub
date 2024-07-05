export default function DomainCardPlaceholder() {
  return (
    <div className="grid grid-cols-[60%_1fr] items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 sm:grid-cols-[2fr_1fr_1.5fr] md:grid-cols-[2fr_1fr_0.5fr_1.5fr]">
      <div className="flex items-center gap-2">
        <div className="h-12 w-12 animate-pulse rounded-md bg-gray-200" />
        <div>
          <div className="h-6 w-32 animate-pulse rounded-md bg-gray-200" />
          <div className="mt-1 h-5 w-32 animate-pulse rounded-md bg-gray-200" />
        </div>
      </div>
      <div className="h-6 w-32 animate-pulse rounded-md bg-gray-200" />
      <div className="h-6 w-32 animate-pulse rounded-md bg-gray-200" />
    </div>
  );
}
