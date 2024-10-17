import { cn } from "@dub/utils";
import { CSSProperties } from "react";

const OFFSET_FACTOR = 4;
const SCALE_FACTOR = 0.03;
const OPACITY_FACTOR = 0.1;

export function News() {
  const cardCount = 5;

  return (
    <div className="overflow-hidden px-3 pb-3 pt-8">
      <div className="group relative size-full">
        {[...Array(cardCount)].map((_, idx) => (
          <div
            className={cn(
              "absolute left-0 top-0 scale-[var(--scale)] transition-[opacity,transform] duration-200",
              cardCount - idx > 3
                ? "opacity-0 group-hover:translate-y-[var(--y)] group-hover:opacity-[var(--opacity)]"
                : "translate-y-[var(--y)] opacity-[var(--opacity)]",
            )}
            style={
              {
                "--y": `-${(cardCount - (idx + 1)) * OFFSET_FACTOR}%`,
                "--scale": 1 - (cardCount - (idx + 1)) * SCALE_FACTOR,
                "--opacity": 1 - (cardCount - (idx + 1)) * OPACITY_FACTOR,
              } as CSSProperties
            }
          >
            <NewsCard
              key={idx}
              title="Title Title"
              description="Description of the article that clicking this card will take you to"
              hideContent={cardCount - idx > 2}
              active={idx === cardCount - 1}
            />
          </div>
        ))}
        <div className="invisible" aria-hidden>
          <NewsCard
            title="Title Title"
            description="Description of the article that clicking this card will take you to"
          />
        </div>
      </div>
    </div>
  );
}

function NewsCard({
  title,
  description,
  hideContent,
  active,
}: {
  title: string;
  description: string;
  hideContent?: boolean;
  active?: boolean;
}) {
  return (
    <div className="relative gap-2 rounded-lg border border-neutral-200 bg-white p-3 text-[0.8125rem]">
      <div className={cn(hideContent && "invisible")}>
        <div className="flex flex-col gap-1">
          <span className="line-clamp-1 font-medium text-neutral-900">
            {title}
          </span>
          <p className="line-clamp-2 text-neutral-500">{description}</p>
        </div>
        <div className="mt-3 aspect-[16/9] w-full shrink-0 rounded bg-neutral-200" />
        <div
          className={cn(
            "h-0 overflow-hidden opacity-0 transition-[height,opacity] duration-200 group-hover:h-7 group-hover:opacity-100",
          )}
        >
          <div className="flex items-center justify-between pt-3 text-xs">
            <button className="font-medium text-neutral-700 transition-colors duration-75 hover:text-neutral-900">
              Read more
            </button>
            <button className="text-neutral-600 transition-colors duration-75 hover:text-neutral-900">
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
