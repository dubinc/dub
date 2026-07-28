"use client";

import {
  AnimatedSizeContainer,
  Check2,
  LoadingSpinner,
  Magnifier,
  ScrollContainer,
  Switch,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { Command } from "cmdk";
import { ReactNode } from "react";

export function AudienceLimitSelectShell<T extends { id: string }>({
  selectedIds,
  setSelectedIds,
  title,
  enabledDescription,
  disabledDescription,
  searchPlaceholder,
  search,
  setSearch,
  useAsync,
  items,
  getItemValue,
  renderItem,
}: {
  selectedIds: string[] | null;
  setSelectedIds: (ids: string[] | null) => void;
  title: string;
  enabledDescription: string;
  disabledDescription: string;
  searchPlaceholder: string;
  search: string;
  setSearch: (search: string) => void;
  useAsync: boolean;
  items: T[] | undefined;
  getItemValue: (item: T) => string;
  renderItem: (item: T) => ReactNode;
}) {
  const limitEnabled = selectedIds !== null;

  return (
    <div>
      <div className="flex items-start gap-3">
        <div className="flex h-5 shrink-0 items-center">
          <Switch
            checked={limitEnabled}
            fn={(checked) => {
              if (checked) {
                setSelectedIds(selectedIds ?? []);
              } else {
                setSelectedIds(null);
                setSearch("");
              }
            }}
            trackDimensions="w-8 h-4"
            thumbDimensions="w-3 h-3"
            thumbTranslate="translate-x-4"
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-content-emphasis text-sm font-medium">
            {title}
          </span>
          <p className="text-content-subtle text-xs">
            {limitEnabled ? enabledDescription : disabledDescription}
          </p>
        </div>
      </div>

      <AnimatedSizeContainer
        height
        transition={{ ease: "easeInOut", duration: 0.1 }}
        className="-m-0.5"
      >
        <div className="p-0.5">
          {limitEnabled && (
            <div className="mt-3">
              <Command loop shouldFilter={!useAsync}>
                <label className="relative flex grow items-center overflow-hidden rounded-lg border border-neutral-300 focus-within:border-neutral-500 focus-within:ring-1 focus-within:ring-neutral-500">
                  <Magnifier className="text-content-default ml-3 size-3.5 shrink-0" />
                  <Command.Input
                    placeholder={searchPlaceholder}
                    value={search}
                    onValueChange={setSearch}
                    className="grow border-none px-2 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-0 sm:text-sm"
                  />
                </label>
                <div className="mt-1">
                  <ScrollContainer className="h-[190px]">
                    <Command.List className="flex w-full flex-col gap-1 p-1">
                      {items !== undefined ? (
                        <>
                          {items.map((item) => {
                            const checked = Boolean(
                              selectedIds?.includes(item.id),
                            );

                            return (
                              <Command.Item
                                key={item.id}
                                value={getItemValue(item)}
                                onSelect={() =>
                                  setSelectedIds(
                                    selectedIds?.includes(item.id)
                                      ? selectedIds.filter(
                                          (id) => id !== item.id,
                                        )
                                      : [...(selectedIds ?? []), item.id],
                                  )
                                }
                                className={cn(
                                  "flex cursor-pointer select-none items-center gap-3 whitespace-nowrap rounded-md px-3 py-2.5 text-left text-sm text-neutral-700",
                                  "data-[selected=true]:bg-neutral-100",
                                )}
                              >
                                <div
                                  className={cn(
                                    "border-border-emphasis flex size-4 shrink-0 items-center justify-center rounded border bg-white transition-colors duration-75",
                                    checked &&
                                      "border-neutral-900 bg-neutral-900",
                                  )}
                                >
                                  {checked && (
                                    <span className="sr-only">Checked</span>
                                  )}
                                  <Check2
                                    className={cn(
                                      "size-2.5 text-white transition-[transform,opacity] duration-75",
                                      !checked && "scale-75 opacity-0",
                                    )}
                                  />
                                </div>
                                {renderItem(item)}
                              </Command.Item>
                            );
                          })}
                          {!useAsync ? (
                            <Command.Empty className="flex min-h-12 items-center justify-center text-sm text-neutral-500">
                              No matches
                            </Command.Empty>
                          ) : items.length === 0 ? (
                            <div className="flex min-h-12 items-center justify-center text-sm text-neutral-500">
                              No matches
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <Command.Loading>
                          <div className="flex h-12 items-center justify-center">
                            <LoadingSpinner />
                          </div>
                        </Command.Loading>
                      )}
                    </Command.List>
                  </ScrollContainer>
                </div>
              </Command>
            </div>
          )}
        </div>
      </AnimatedSizeContainer>
    </div>
  );
}
