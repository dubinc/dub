"use client";

import { GroupBadge } from "@/ui/partners/rewards/group-badge";
import { ThreeDots } from "@/ui/shared/icons";
import {
  AnimatedSizeContainer,
  Button,
  MenuItem,
  Popover,
  RadioGroup,
  RadioGroupItem,
  Users,
  useMediaQuery,
  useScrollProgress,
} from "@dub/ui";
import { Pen2, Plus2, Trash } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { Command } from "cmdk";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";

export type AdditionalRewardOption = {
  id: string;
  label: ReactNode;
  searchValue: string;
  isGroup?: boolean;
  partnersCount?: number | null;
};

const createItemClassName =
  "group/button flex h-10 cursor-pointer items-center justify-start gap-2 rounded-lg px-2.5 data-[selected=true]:bg-black/[0.03]";

export function AdditionalRewardOptionList({
  options,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
  searchPlaceholder,
  emptyLabel,
  onCreate,
  createLabel,
  showModal,
}: {
  options: AdditionalRewardOption[];
  selectedId: string | null | undefined;
  onSelect: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  searchPlaceholder: string;
  emptyLabel: string;
  onCreate?: () => void;
  createLabel?: string;
  showModal?: boolean;
}) {
  const [search, setSearch] = useState("");
  const { isMobile } = useMediaQuery();
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollProgress, updateScrollProgress } = useScrollProgress(scrollRef);
  const wasModalOpenRef = useRef(false);

  useEffect(() => {
    if (showModal === undefined) {
      return;
    }

    if (showModal) {
      if (!wasModalOpenRef.current) {
        setSearch("");
      }
      wasModalOpenRef.current = true;
    } else {
      wasModalOpenRef.current = false;
      setSearch("");
    }
  }, [showModal]);

  useEffect(() => {
    if (showModal === false) {
      return;
    }

    inputRef.current &&
      !isMobile &&
      setTimeout(() => inputRef.current?.focus(), 10);
  }, [isMobile, showModal]);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredOptions = useMemo(() => {
    if (!normalizedSearch) {
      return options;
    }

    return options.filter((option) =>
      option.searchValue.toLowerCase().includes(normalizedSearch),
    );
  }, [options, normalizedSearch]);

  const showCreate =
    Boolean(normalizedSearch) &&
    filteredOptions.length === 0 &&
    Boolean(onCreate) &&
    Boolean(createLabel);

  return (
    <AnimatedSizeContainer
      height
      transition={{ ease: "easeOut", duration: 0.1 }}
      className="pointer-events-auto -m-1 overflow-clip"
    >
      <Command loop shouldFilter={false} className="p-1 pb-2">
        <Command.Input
          ref={inputRef}
          placeholder={searchPlaceholder}
          value={search}
          onValueChange={setSearch}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
            }
          }}
          className="border-border-default placeholder:text-content-muted w-full rounded-lg border px-2.5 py-2 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 sm:text-sm"
        />
        <div className="relative">
          <div
            ref={scrollRef}
            onScroll={updateScrollProgress}
            className="scrollbar-hide max-h-[calc(100dvh-250px)] overflow-y-auto"
          >
            <Command.List className="mt-4">
              <RadioGroup
                value={
                  filteredOptions.some((option) => option.id === selectedId)
                    ? selectedId ?? undefined
                    : undefined
                }
                onValueChange={onSelect}
                className="flex flex-col gap-0"
              >
                {filteredOptions.map((option) => (
                  <Command.Item
                    key={option.id}
                    value={`${option.searchValue} ${option.id}`}
                    onSelect={() => onSelect(option.id)}
                    className="outline-none"
                  >
                    <AdditionalRewardOptionRow
                      option={option}
                      selected={option.id === selectedId}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  </Command.Item>
                ))}
              </RadioGroup>

              {showCreate && (
                <Command.Item
                  className={createItemClassName}
                  value={`create::${search}`}
                  forceMount
                  onSelect={() => {
                    onCreate?.();
                  }}
                >
                  <Plus2 className="size-3.5 shrink-0" />
                  <span className="min-w-0 truncate text-sm font-medium">
                    {createLabel}
                  </span>
                </Command.Item>
              )}

              {filteredOptions.length === 0 && (
                <div className="text-content-default flex select-none flex-col items-center justify-center gap-2 py-12">
                  <span className="text-sm font-medium">{emptyLabel}</span>
                </div>
              )}
            </Command.List>
          </div>

          <div
            className="pointer-events-none absolute bottom-0 left-0 hidden h-16 w-full bg-gradient-to-t from-white sm:block"
            style={{ opacity: 1 - Math.pow(scrollProgress, 2) }}
          />
        </div>
      </Command>
    </AnimatedSizeContainer>
  );
}

function AdditionalRewardOptionRow({
  option,
  selected,
  onEdit,
  onDelete,
}: {
  option: AdditionalRewardOption;
  selected: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const [openPopover, setOpenPopover] = useState(false);
  const showActions = Boolean(onEdit || onDelete);

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-lg py-2 pl-2.5 pr-1.5 transition-colors hover:bg-neutral-100",
        selected && "bg-transparent",
      )}
    >
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
        <RadioGroupItem value={option.id} className="size-3.5 shrink-0" />
        <div className="text-content-default min-w-0 flex-1 text-sm leading-5">
          {option.label}
        </div>
      </label>

      <div className="flex w-[92px] shrink-0 items-center justify-between">
        <div className="flex items-center gap-1">
          <Users className="size-3.5 shrink-0 text-neutral-500" />
          {option.isGroup ? (
            <GroupBadge />
          ) : (
            <span className="text-content-default text-sm font-medium tabular-nums">
              {option.partnersCount ?? 0}
            </span>
          )}
        </div>

        {showActions ? (
          <Popover
            align="end"
            openPopover={openPopover}
            setOpenPopover={setOpenPopover}
            content={
              <div className="flex min-w-32 flex-col gap-1 p-1">
                {onEdit && (
                  <MenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenPopover(false);
                      onEdit(option.id);
                    }}
                    icon={<Pen2 className="size-4" />}
                  >
                    Edit
                  </MenuItem>
                )}
                {onDelete && (
                  <MenuItem
                    variant="danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenPopover(false);
                      onDelete(option.id);
                    }}
                    icon={<Trash className="size-4" />}
                  >
                    Delete
                  </MenuItem>
                )}
              </div>
            }
          >
            <Button
              type="button"
              variant="outline"
              icon={<ThreeDots className="size-3.5" />}
              className="size-6 rounded-lg border-transparent p-0 hover:bg-black/5"
              onClick={(e) => {
                e.stopPropagation();
                setOpenPopover(!openPopover);
              }}
            />
          </Popover>
        ) : (
          <div className="size-6" />
        )}
      </div>
    </div>
  );
}
