"use client";

import { cn } from "@dub/utils";
import {
  CSSProperties,
  PropsWithChildren,
  ReactNode,
  useMemo,
  useRef,
  useState,
} from "react";

const OFFSET_FACTOR = 4;
const SCALE_FACTOR = 0.03;
const OPACITY_FACTOR = 0.1;

export function CardStack({
  cards,
}: {
  cards: { id: string; content: ReactNode }[];
}) {
  const cardCount = cards.length;

  const [currentIndex, setCurrentIndex] = useState(0);

  const sortedCards = useMemo(() => {
    if (!cards.length) return [];

    return [
      cards[currentIndex],
      ...cards.slice(currentIndex + 1),
      ...cards.slice(0, currentIndex),
    ].reverse();
  }, [cards, currentIndex]);

  return sortedCards.length ? (
    <div
      className="group overflow-hidden border-t border-neutral-200 p-3 pt-6"
      data-active={cardCount !== 0}
    >
      <div className="relative size-full">
        {sortedCards.map(({ id, content }, idx) => (
          <div
            key={id}
            className={cn(
              "absolute inset-0 scale-[var(--scale)] transition-[opacity,transform] duration-200",
              cardCount - idx > 3
                ? [
                    "opacity-0 sm:group-hover:translate-y-[var(--y)] sm:group-hover:opacity-[var(--opacity)]",
                    "sm:group-has-[*[data-dragging=true]]:translate-y-[var(--y)] sm:group-has-[*[data-dragging=true]]:opacity-[var(--opacity)]",
                  ]
                : "translate-y-[var(--y)] opacity-[var(--opacity)]",
            )}
            style={
              {
                "--y": `-${(cardCount - (idx + 1)) * OFFSET_FACTOR}%`,
                "--scale": 1 - (cardCount - (idx + 1)) * SCALE_FACTOR,
                "--opacity":
                  // Hide cards that are too far down (will show top 3)
                  cardCount - (idx + 1) >= 3
                    ? 0
                    : 1 - (cardCount - (idx + 1)) * OPACITY_FACTOR,
              } as CSSProperties
            }
            aria-hidden={idx !== cardCount - 1}
          >
            <Card
              hideContent={cardCount - idx > 2}
              active={idx === cardCount - 1}
              onDismiss={() => setCurrentIndex((i) => (i + 1) % cardCount)}
            >
              {content}
            </Card>
          </div>
        ))}

        <div className="pointer-events-none invisible" aria-hidden>
          <Card></Card>
        </div>
      </div>
    </div>
  ) : null;
}

function Card({
  children,
  active,
  hideContent,
  onDismiss,
}: PropsWithChildren<{
  active?: boolean;
  hideContent?: boolean;
  onDismiss?: () => void;
}>) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    start: number;
    delta: number;
    startTime: number;
    maxDelta: number;
  }>({
    start: 0,
    delta: 0,
    startTime: 0,
    maxDelta: 0,
  });
  const animation = useRef<Animation>(undefined);
  const [dragging, setDragging] = useState(false);

  const onDragMove = (e: PointerEvent) => {
    if (!ref.current) return;
    const { clientX } = e;
    const dx = clientX - drag.current.start;
    drag.current.delta = dx;
    drag.current.maxDelta = Math.max(drag.current.maxDelta, Math.abs(dx));
    ref.current.style.setProperty("--dx", dx.toString());
  };

  const dismiss = () => {
    if (!ref.current) return;

    const cardWidth = ref.current.getBoundingClientRect().width;
    const translateX = Math.sign(drag.current.delta) * cardWidth;

    // Dismiss card
    animation.current = ref.current.animate(
      [
        {},
        { offset: 0.9, opacity: 0, transform: `translateX(${translateX}px)` },
        { offset: 1.0, opacity: 0, transform: "translateX(0)" },
      ],
      { duration: 150, easing: "ease-in-out", fill: "forwards" },
    );

    animation.current.onfinish = () => {
      onDismiss?.();
      ref.current?.style.setProperty("--dx", "0");
      animation.current?.cancel();
      drag.current = { start: 0, delta: 0, startTime: 0, maxDelta: 0 };
    };
  };

  const stopDragging = (canceled: boolean) => {
    if (!ref.current) return;
    unbindListeners();
    setDragging(false);

    const dx = drag.current.delta;
    if (Math.abs(dx) > ref.current.clientWidth / (canceled ? 2 : 3)) {
      dismiss();
      return;
    }

    // Animate back to original position
    animation.current = ref.current.animate(
      { transform: "translateX(0)" },
      { duration: 150, easing: "ease-in-out" },
    );
    animation.current.onfinish = () =>
      ref.current?.style.setProperty("--dx", "0");

    drag.current = { start: 0, delta: 0, startTime: 0, maxDelta: 0 };
  };

  const onDragEnd = () => stopDragging(false);
  const onDragCancel = () => stopDragging(true);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!active || !ref.current || animation.current?.playState === "running")
      return;

    bindListeners();
    setDragging(true);
    drag.current.start = e.clientX;
    drag.current.startTime = Date.now();
    drag.current.delta = 0;
    ref.current.style.setProperty("--w", ref.current.clientWidth.toString());
  };

  const onClick = () => {
    if (!ref.current) return;
    // if (
    //   isMobile &&
    //   drag.current.maxDelta < ref.current.clientWidth / 10 &&
    //   (!drag.current.startTime || Date.now() - drag.current.startTime < 250)
    // ) {
    //   // Touch user didn't drag far or for long, open the link
    //   window.open(href, "_blank");
    // }
  };

  const bindListeners = () => {
    document.addEventListener("pointermove", onDragMove);
    document.addEventListener("pointerup", onDragEnd);
    document.addEventListener("pointercancel", onDragCancel);
  };

  const unbindListeners = () => {
    document.removeEventListener("pointermove", onDragMove);
    document.removeEventListener("pointerup", onDragEnd);
    document.removeEventListener("pointercancel", onDragCancel);
  };

  return (
    <div
      ref={ref}
      className={cn(
        "relative h-56 select-none gap-2 rounded-lg border border-neutral-200 bg-white p-3 text-[0.8125rem]",
        "translate-x-[calc(var(--dx)*1px)] rotate-[calc(var(--dx)*0.05deg)] opacity-[calc(1-max(var(--dx),-1*var(--dx))/var(--w)/2)]",
        "transition-shadow data-[dragging=true]:shadow-[0_4px_12px_0_#0000000D]",
      )}
      data-dragging={dragging}
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      <div className={cn(hideContent && "invisible")}>{children}</div>
    </div>
  );
}
