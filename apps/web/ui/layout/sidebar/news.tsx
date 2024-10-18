import { cn } from "@dub/utils";
import Link from "next/link";
import { CSSProperties, useRef, useState } from "react";

const OFFSET_FACTOR = 4;
const SCALE_FACTOR = 0.03;
const OPACITY_FACTOR = 0.1;

export function News() {
  const [cards, setCards] = useState([1, 2, 3, 4, 5, 6]);
  const cardCount = cards.length;

  return cards.length ? (
    <div className="overflow-hidden px-3 pb-3 pt-8">
      <div className="group relative size-full">
        {cards.map((id, idx) => (
          <div
            key={id}
            className={cn(
              "absolute left-0 top-0 scale-[var(--scale)] transition-[opacity,transform] duration-200",
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
                "--opacity": 1 - (cardCount - (idx + 1)) * OPACITY_FACTOR,
              } as CSSProperties
            }
            aria-hidden={idx !== cardCount - 1}
          >
            <NewsCard
              key={idx}
              title="Title Title"
              description="Description of the article that clicking this card will take you to"
              hideContent={cardCount - idx > 2}
              active={idx === cardCount - 1}
              onDismiss={() => {
                setCards((cards) => cards.filter((c) => c !== id));
              }}
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
  ) : null;
}

function NewsCard({
  title,
  description,
  onDismiss,
  hideContent,
  active,
}: {
  title: string;
  description: string;
  onDismiss?: () => void;
  hideContent?: boolean;
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
      )}
      data-dragging={dragging}
      onPointerDown={onPointerDown}
    >
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
            "h-0 overflow-hidden opacity-0 transition-[height,opacity] duration-200",
            "group-hover:h-7 group-hover:opacity-100 group-has-[*[data-dragging=true]]:h-7 group-has-[*[data-dragging=true]]:opacity-100",
          )}
        >
          <div className="flex items-center justify-between pt-3 text-xs">
            <Link
              href="#"
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
