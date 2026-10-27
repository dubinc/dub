"use client";

import { Combobox } from "@dub/ui";
import { cn, OG_AVATAR_URL } from "@dub/utils";
import { useMemo, useState } from "react";

export type ProgramSummary = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
};

export function ProgramCombobox({
  enrollments,
  isLoading,
  selectedSlug,
  onSelect,
}: {
  enrollments: { program: ProgramSummary }[] | undefined;
  isLoading: boolean;
  selectedSlug?: string;
  onSelect: (program: ProgramSummary) => void;
}) {
  const [open, setOpen] = useState(false);

  const options = useMemo(
    () =>
      enrollments?.map((e) => ({
        value: e.program.slug,
        label: e.program.name,
        icon: (
          <img
            src={
              e.program.logo ||
              `${OG_AVATAR_URL}${encodeURIComponent(e.program.name)}`
            }
            alt={e.program.name}
            className="size-3.5 rounded-full"
          />
        ),
      })),
    [enrollments],
  );

  const selected = useMemo(
    () => options?.find((o) => o.value === selectedSlug) ?? null,
    [options, selectedSlug],
  );

  const isReady = !isLoading && enrollments !== undefined;

  return (
    <Combobox
      forceDropdown
      options={isReady ? options : undefined}
      setSelected={(opt) => {
        if (!opt) return;
        const enrollment = enrollments?.find(
          (e) => e.program.slug === opt.value,
        );
        if (enrollment) onSelect(enrollment.program);
      }}
      selected={selected}
      icon={selected?.icon}
      caret
      placeholder={isReady ? "Select program" : ""}
      searchPlaceholder="Search programs..."
      matchTriggerWidth
      popoverProps={{
        contentClassName: "w-[var(--radix-popover-trigger-width)]",
      }}
      open={open}
      onOpenChange={setOpen}
      buttonProps={{
        className: cn(
          "w-full max-w-[360px] justify-start border-neutral-300 px-2.5 h-9 text-sm",
          "data-[state=open]:ring-1 data-[state=open]:ring-neutral-500 data-[state=open]:border-neutral-500",
          "focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition-none",
        ),
      }}
      labelProps={{
        className: "text-sm text-neutral-600",
      }}
      inputClassName="text-sm h-10"
      optionClassName="h-8"
      emptyState={
        <div className="flex w-full flex-col items-center gap-2 py-3 text-xs text-neutral-500">
          No programs found
        </div>
      }
    >
      {!isReady ? (
        <div className="flex items-center gap-1.5 text-sm">
          <div className="size-3.5 animate-pulse rounded-full bg-neutral-200" />
          <div className="h-3.5 w-24 animate-pulse rounded bg-neutral-200" />
        </div>
      ) : (
        selected?.label
      )}
    </Combobox>
  );
}
