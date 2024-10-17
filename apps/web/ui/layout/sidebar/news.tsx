import { CSSProperties } from "react";

export function News() {
  const cardCount = 5;

  return (
    <div className="p-3">
      <div className="relative size-full">
        {[...Array(cardCount - 1)].map((_, idx) => (
          <div
            className="absolute left-0 top-0 translate-y-[var(--y)] scale-x-[var(--scale)]"
            style={
              {
                "--y": `-${(cardCount - 1 - idx) * 5}%`,
                "--scale": 1 - 0.4 / idx / cardCount,
              } as CSSProperties
            }
          >
            <NewsCard
              key={idx}
              title="Title Title"
              description="Description of the article that clicking this card will take you to"
            />
          </div>
        ))}
        <NewsCard
          title="Title Title"
          description="Description of the article that clicking this card will take you to"
        />
      </div>
    </div>
  );
}

function NewsCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="relative flex items-center gap-2 rounded-lg border border-neutral-200 bg-white p-2 text-xs">
      <div className="h-9 w-12 shrink-0 rounded-md bg-neutral-200" />
      <div className="flex flex-col gap-1">
        <span className="line-clamp-1 font-medium text-neutral-900">
          {title}
        </span>
        <p className="line-clamp-2 text-neutral-500">{description}</p>
      </div>
    </div>
  );
}
