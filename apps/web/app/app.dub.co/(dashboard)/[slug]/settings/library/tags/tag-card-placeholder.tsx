import { CardList } from "@dub/ui";

export function TagCardPlaceholder() {
  return (
    <CardList.Card>
      <div className="flex h-8 items-center justify-between gap-5 sm:gap-8 md:gap-12">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-pulse rounded-md bg-neutral-200" />
          <div className="h-5 w-16 animate-pulse rounded-md bg-neutral-200 sm:w-32" />
        </div>
        <div className="flex items-center gap-5 sm:gap-8 md:gap-12">
          <div className="h-5 w-16 animate-pulse rounded-md bg-neutral-200" />
          <div className="w-8" />
        </div>
      </div>
    </CardList.Card>
  );
}
