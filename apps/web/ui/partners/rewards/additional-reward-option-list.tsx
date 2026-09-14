"use client";

import { GroupBadge } from "@/ui/partners/rewards/group-badge";
import { ThreeDots } from "@/ui/shared/icons";
import {
  Button,
  MenuItem,
  Popover,
  RadioGroup,
  RadioGroupItem,
  Users,
} from "@dub/ui";
import { Pen2, Trash } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { ReactNode, useState } from "react";

export type AdditionalRewardOption = {
  id: string;
  label: ReactNode;
  isGroup?: boolean;
  partnersCount?: number | null;
};

export function AdditionalRewardOptionList({
  options,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
}: {
  options: AdditionalRewardOption[];
  selectedId: string | null | undefined;
  onSelect: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  return (
    <RadioGroup
      value={selectedId ?? undefined}
      onValueChange={onSelect}
      className="flex flex-col gap-0"
    >
      {options.map((option) => (
        <AdditionalRewardOptionRow
          key={option.id}
          option={option}
          selected={option.id === selectedId}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </RadioGroup>
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
                e.preventDefault();
                e.stopPropagation();
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
