"use client";

import { useLocalStorage } from "@dub/ui";
import { cn } from "@dub/utils";
import Image from "next/image";
import Link from "next/link";
import { CSSProperties, useRef, useState } from "react";

export interface NewsArticle {
  slug: string;
  title: string;
  summary: string;
  image: string;
}

const OFFSET_FACTOR = 4;
const SCALE_FACTOR = 0.03;
const OPACITY_FACTOR = 0.1;

export function News({ articles }: { articles: NewsArticle[] }) {
  const [dismissedNews, setDismissedNews] = useLocalStorage<string[]>(
    "dismissed-news",
    [],
  );

  const cards = articles.filter(({ slug }) => !dismissedNews.includes(slug));
  const cardCount = cards.length;

  return cards.length ? (
    <div className="group overflow-hidden px-3 pb-3 pt-8">
      <div className="relative size-full">
        {cards.toReversed().map(({ slug, title, summary, image }, idx) => (
          <div
            key={slug}
            className={cn(
              "absolute left-0 top-0 size-full scale-[var(--scale)] transition-[opacity,transform] duration-200",
              cardCount - idx > 3
                ? [
                    "opacity-0 group-hover:translate-y-[var(--y)] group-hover:opacity-[var(--opacity)]",
                    "group-has-[*[data-dragging=true]]:translate-y-[var(--y)] group-has-[*[data-dragging=true]]:opacity-[var(--opacity)]",
                  ]
                : "translate-y-[var(--y)] opacity-[var(--opacity)]",
            )}
            style={
              {
                "--y": `-${(cardCount - (idx + 1)) * OFFSET_FACTOR}%`,
                "--scale": 1 - (cardCount - (idx + 1)) * SCALE_FACTOR,
                "--opacity":
                  // Hide cards that are too far down (will show top 6)
                  cardCount - (idx + 1) >= 6
                    ? 0
                    : 1 - (cardCount - (idx + 1)) * OPACITY_FACTOR,
              } as CSSProperties
            }
            aria-hidden={idx !== cardCount - 1}
          >
            <NewsCard
              key={idx}
              title={title}
              description={summary}
              image={image}
              href={slug}
              hideContent={cardCount - idx > 2}
              active={idx === cardCount - 1}
              onDismiss={
                () => setDismissedNews([slug, ...dismissedNews.slice(0, 50)]) // Limit to keep storage size low
              }
            />
          </div>
        ))}
        <div className="invisible" aria-hidden>
          <NewsCard title="Title" description="Description" />
        </div>
      </div>
    </div>
  ) : null;
}

function NewsCard({
  title,
  description,
  image,
  onDismiss,
  hideContent,
  href,
  active,
}: {
  title: string;
  description: string;
  image?: string;
  onDismiss?: () => void;
  hideContent?: boolean;
  href?: string;
  active?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ start: number; delta: number }>({ start: 0, delta: 0 });
  const animation = useRef<Animation>();
  const [dragging, setDragging] = useState(false);

  const onDragMove = (e: PointerEvent) => {
    if (!ref.current) return;
    const { clientX } = e;
    const dx = clientX - drag.current.start;
    drag.current.delta = dx;
    ref.current.style.setProperty("--dx", dx.toString());
  };

  const dismiss = () => {
    if (!ref.current) return;

    // Dismiss card
    animation.current = ref.current.animate(
      { opacity: 0 },
      { duration: 150, easing: "ease-in-out", fill: "forwards" },
    );
    animation.current.onfinish = () => onDismiss?.();
  };

  const onDragEnd = () => {
    if (!ref.current) return;
    document.removeEventListener("pointermove", onDragMove);
    document.removeEventListener("pointerup", onDragEnd);

    const dx = drag.current.delta;
    if (Math.abs(dx) > ref.current.clientWidth / 3) {
      dismiss();
      return;
    }

    setDragging(false);

    // Animate back to original position
    animation.current = ref.current.animate(
      { transform: "translateX(0)" },
      { duration: 150, easing: "ease-in-out" },
    );
    animation.current.onfinish = () =>
      ref.current?.style.setProperty("--dx", "0");
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!ref.current || animation.current?.playState === "running") return;
    document.addEventListener("pointermove", onDragMove);
    document.addEventListener("pointerup", onDragEnd);

    setDragging(true);
    drag.current.start = e.clientX;
    drag.current.delta = 0;
    ref.current.style.setProperty("--w", ref.current.clientWidth.toString());
  };

  return (
    <div
      ref={ref}
      className={cn(
        "relative select-none gap-2 rounded-lg border border-neutral-200 bg-white p-3 text-[0.8125rem]",
        "translate-x-[calc(var(--dx)*1px)] rotate-[calc(var(--dx)*0.05deg)] opacity-[calc(1-max(var(--dx),-1*var(--dx))/var(--w)/2)]",
        "transition-shadow data-[dragging=true]:shadow-[0_4px_12px_0_#0000000D]",
      )}
      data-dragging={dragging}
      onPointerDown={onPointerDown}
    >
      <div className={cn(hideContent && "invisible")}>
        <div className="flex flex-col gap-1">
          <span className="line-clamp-1 font-medium text-neutral-900">
            {title}
          </span>
          <p className="line-clamp-2 h-10 leading-5 text-neutral-500">
            {description}
          </p>
        </div>
        <div className="relative mt-3 aspect-[16/9] w-full shrink-0 overflow-hidden rounded border border-neutral-200 bg-neutral-100">
          {image && (
            <Image
              src={image}
              alt=""
              fill
              className="rounded object-cover object-center"
              draggable={false}
            />
          )}
        </div>
        <div
          className={cn(
            "h-0 overflow-hidden opacity-0 transition-[height,opacity] duration-200",
            "group-hover:h-7 group-hover:opacity-100 group-has-[*[data-dragging=true]]:h-7 group-has-[*[data-dragging=true]]:opacity-100",
          )}
        >
          <div className="flex items-center justify-between pt-3 text-xs">
            <Link
              href={href || "https://dub.co"}
              target="_blank"
              className="font-medium text-neutral-700 transition-colors duration-75 hover:text-neutral-900"
            >
              Read more
            </Link>
            <button
              type="button"
              onClick={dismiss}
              className="text-neutral-600 transition-colors duration-75 hover:text-neutral-900"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
