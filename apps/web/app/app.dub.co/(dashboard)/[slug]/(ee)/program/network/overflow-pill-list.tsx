"use client";

import { Tooltip, useResizeObserver } from "@dub/ui";
import type { Icon } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { useEffect, useRef, useState } from "react";

export function ListRow({
  items,
  className,
}: {
  items?: { icon?: Icon; label: string }[];
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [isReady, setIsReady] = useState(false);

  const [shownItems, setShownItems] = useState<
    { icon?: Icon; label: string }[] | undefined
  >(items);

  useEffect(() => {
    if (isReady) return;

    setIsReady(false);
    setShownItems(items);
  }, [items, isReady]);

  useEffect(() => {
    if (!containerRef.current) return;

    if (
      shownItems?.length &&
      containerRef.current.scrollWidth > containerRef.current.clientWidth
    ) {
      setIsReady(false);
      setShownItems(shownItems?.slice(0, -1));
    } else {
      setIsReady(true);
    }
  }, [shownItems]);

  const entry = useResizeObserver(containerRef);
  useEffect(() => {
    if (!containerRef.current) return;

    if (containerRef.current.scrollWidth > containerRef.current.clientWidth)
      setIsReady(false);
  }, [entry]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "overflow-hidden",
        items?.length && !isReady && "opacity-0",
      )}
    >
      <div className={cn("flex gap-1", className)}>
        {items ? (
          items.length ? (
            <>
              {shownItems?.map(({ icon, label }) => (
                <ListPill key={label} icon={icon} label={label} />
              ))}
              {(shownItems?.length ?? 0) < items.length && (
                <Tooltip
                  content={
                    <div className="flex max-w-sm flex-wrap gap-1 p-2">
                      {items
                        .filter(
                          ({ label }) =>
                            !shownItems?.some(
                              ({ label: shownLabel }) => shownLabel === label,
                            ),
                        )
                        .map(({ icon, label }) => (
                          <ListPill key={label} icon={icon} label={label} />
                        ))}
                    </div>
                  }
                >
                  <div className="text-content-default flex h-7 select-none items-center rounded-full bg-neutral-100 px-2 text-xs font-medium transition-colors hover:bg-neutral-200">
                    +{items.length - (shownItems?.length ?? 0)}
                  </div>
                </Tooltip>
              )}
            </>
          ) : (
            <div className="flex h-7 w-fit items-center rounded-full border border-dashed border-neutral-300 bg-neutral-50 px-2">
              <span className="text-content-subtle text-xs opacity-60">
                No categories
              </span>
            </div>
          )
        ) : (
          [...Array(2)].map((_, idx) => (
            <div key={idx} className="h-7 w-20 rounded-full bg-neutral-100" />
          ))
        )}
      </div>
    </div>
  );
}

function ListPill({ icon: Icon, label }: { icon?: Icon; label: string }) {
  return (
    <div className="flex h-7 items-center gap-1.5 rounded-full bg-neutral-100 px-2">
      {Icon && <Icon className="text-content-emphasis size-3 shrink-0" />}
      <span className="text-content-default whitespace-nowrap text-xs font-medium">
        {label}
      </span>
    </div>
  );
}
