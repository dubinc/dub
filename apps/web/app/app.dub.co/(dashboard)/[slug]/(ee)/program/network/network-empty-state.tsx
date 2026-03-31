import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { Button } from "@dub/ui";
import { Star, StarFill } from "@dub/ui/icons";
import { SVGProps, useId } from "react";

export function NetworkEmptyState({
  isFiltered,
  isStarred,
  onClearAllFilters,
}: {
  isFiltered: boolean;
  isStarred: boolean;
  onClearAllFilters: () => void;
}) {
  return (
    <AnimatedEmptyState
      title="No partners found"
      description={
        isFiltered || isStarred ? (
          <>
            Press{" "}
            <span className="text-content-default bg-bg-emphasis rounded-md px-1 py-0.5 text-xs font-semibold">
              Esc
            </span>{" "}
            to clear all filters.
          </>
        ) : (
          "There are no partners for you to discover yet."
        )
      }
      className="border-none md:min-h-[400px]"
      cardClassName="py-3"
      cardCount={2}
      cardContent={(idx) => (
        <div className="flex grow items-center gap-4">
          {idx % 2 === 0 || isStarred ? (
            <StarFill className="size-3 shrink-0 text-amber-500" />
          ) : (
            <Star className="text-content-muted size-3 shrink-0" />
          )}
          <DemoAvatar className="text-content-default size-9 shrink-0" />
          <div className="flex grow flex-col gap-2">
            <div className="h-2.5 w-full min-w-0 rounded bg-neutral-200" />
            <div className="h-2.5 w-12 min-w-0 rounded bg-neutral-200" />
          </div>
        </div>
      )}
      addButton={
        isFiltered || isStarred ? (
          <Button
            type="button"
            text="Clear all filters"
            className="h-9 rounded-lg"
            onClick={onClearAllFilters}
          />
        ) : undefined
      }
    />
  );
}

function DemoAvatar(props: SVGProps<SVGSVGElement>) {
  const id = useId();

  return (
    <svg
      width="40"
      height="41"
      viewBox="0 0 40 41"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g clipPath={`url(#${id}-clip)`}>
        <path
          d="M20 40.5C31.0457 40.5 40 31.5457 40 20.5C40 9.4543 31.0457 0.5 20 0.5C8.9543 0.5 0 9.4543 0 20.5C0 31.5457 8.9543 40.5 20 40.5Z"
          fill="#F5F5F5"
        />
        <path
          d="M20.0005 22.537C23.0005 22.537 25.4326 20.105 25.4326 17.1049C25.4326 14.1049 23.0005 11.6729 20.0005 11.6729C17.0004 11.6729 14.5684 14.1049 14.5684 17.1049C14.5684 20.105 17.0004 22.537 20.0005 22.537Z"
          fill="#D9D9D9"
        />
        <circle cx="20.0003" cy="40.1297" r="11.8519" fill="#D9D9D9" />
      </g>
      <defs>
        <clipPath id={`${id}-clip`}>
          <path
            d="M0 20.5C0 9.45431 8.95431 0.5 20 0.5C31.0457 0.5 40 9.45431 40 20.5C40 31.5457 31.0457 40.5 20 40.5C8.95431 40.5 0 31.5457 0 20.5Z"
            fill="white"
          />
        </clipPath>
      </defs>
    </svg>
  );
}
