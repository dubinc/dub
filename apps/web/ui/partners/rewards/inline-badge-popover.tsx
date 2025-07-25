"use client";

import { Check2, Popover, useScrollProgress } from "@dub/ui";
import { cn } from "@dub/utils";
import { Command } from "cmdk";
import {
  createContext,
  PropsWithChildren,
  ReactNode,
  useContext,
  useRef,
  useState,
} from "react";

export const InlineBadgePopoverContext = createContext<{
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}>({
  isOpen: false,
  setIsOpen: () => {},
});

export function InlineBadgePopover({
  text,
  invalid,
  children,
}: PropsWithChildren<{ text: ReactNode; invalid?: boolean }>) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover
      openPopover={isOpen}
      setOpenPopover={setIsOpen}
      align="start"
      content={
        <InlineBadgePopoverContext.Provider value={{ isOpen, setIsOpen }}>
          <div className="w-full min-w-32 p-1 text-sm sm:w-auto">
            {children}
          </div>
        </InlineBadgePopoverContext.Provider>
      }
      onWheel={(e) => {
        // Allows scrolling to work when the popover's in a modal/sheet
        e.stopPropagation();
      }}
    >
      <button
        type="button"
        className={cn(
          "inline-block rounded px-1.5 text-sm font-semibold transition-colors",
          invalid
            ? "bg-orange-50 text-orange-500 hover:bg-orange-100 data-[state=open]:bg-orange-100"
            : "bg-blue-50 text-blue-700 hover:bg-blue-100 data-[state=open]:bg-blue-100",
        )}
      >
        {text}
      </button>
    </Popover>
  );
}

export function InlineBadgePopoverMenu({
  items,
  onSelect,
  selectedValue,
}: {
  items: { text: string; value: string; onSelect?: () => void }[];
  onSelect?: (value: string) => void;
  selectedValue?: string;
}) {
  const { setIsOpen } = useContext(InlineBadgePopoverContext);

  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollProgress, updateScrollProgress } = useScrollProgress(scrollRef);

  return (
    <div className="relative">
      <Command loop className="focus:outline-none">
        <Command.List
          className="scrollbar-hide flex max-h-64 flex-col gap-1 overflow-y-auto transition-all"
          ref={scrollRef}
          onScroll={updateScrollProgress}
        >
          {items.map(({ text, value, onSelect: itemOnSelect }) => (
            <Command.Item
              key={text}
              onSelect={() => {
                itemOnSelect?.();
                onSelect?.(value);
                setIsOpen(false);
              }}
              className="flex cursor-pointer items-center justify-between rounded-md px-1.5 py-1 transition-colors duration-150 hover:bg-neutral-100"
            >
              <span className="text-content-default pr-3 text-left text-sm font-medium">
                {text}
              </span>
              {selectedValue === value && (
                <Check2 className="text-content-emphasis size-3.5 shrink-0" />
              )}
            </Command.Item>
          ))}
        </Command.List>
      </Command>
      <div
        className="pointer-events-none absolute bottom-0 left-0 hidden h-12 w-full rounded-b-lg bg-gradient-to-t from-white sm:block"
        style={{ opacity: 1 - Math.pow(scrollProgress, 2) }}
      />
    </div>
  );
}
