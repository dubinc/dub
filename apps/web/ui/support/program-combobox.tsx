"use client";

import { Combobox } from "@dub/ui";
import { cn, OG_AVATAR_URL } from "@dub/utils";
import { useMemo, useState } from "react";

export type ProgramSummary = {
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
            src={e.program.logo || `${OG_AVATAR_URL}${e.program.name}`}
            alt={e.program.name}
            className="size-4 rounded-full"
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
      options={isReady ? options : undefined}
      setSelected={(opt) => {
        const enrollment = enrollments?.find((e) => e.program.slug === opt.value);
        if (enrollment) onSelect(enrollment.program);
      }}
      selected={selected}
      icon={selected?.icon}
      caret
      placeholder={isReady ? "Select program" : ""}
      searchPlaceholder="Search programs..."
      matchTriggerWidth
      open={open}
      onOpenChange={setOpen}
      buttonProps={{
        className: cn(
          "w-full justify-start border-neutral-300 px-3",
          "data-[state=open]:ring-1 data-[state=open]:ring-neutral-500 data-[state=open]:border-neutral-500",
          "focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition-none",
        ),
      }}
      emptyState={
        <div className="flex w-full flex-col items-center gap-2 py-4 text-sm text-neutral-500">
          No programs found
        </div>
      }
    >
      {!isReady ? (
        <div className="flex items-center gap-2">
          <div className="size-4 animate-pulse rounded-full bg-neutral-200" />
          <div className="h-4 w-32 animate-pulse rounded bg-neutral-200" />
        </div>
      ) : (
        selected?.label
      )}
    </Combobox>
  );
}
