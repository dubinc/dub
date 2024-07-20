import { CardList } from "@dub/ui";

export function TagCardPlaceholder() {
  return (
    <CardList.Card>
      <div className="flex h-8 grow items-center gap-5 sm:gap-8 md:gap-12">
        <div className="hidden h-5 w-32 animate-pulse rounded-md bg-gray-200 sm:block" />
        <div className="hidden h-5 w-12 animate-pulse rounded-md bg-gray-200 sm:block" />
      </div>
    </CardList.Card>
  );
}
