"use client";

import { Combobox } from "@dub/ui";
import { cn, OG_AVATAR_URL } from "@dub/utils";
import { useMemo, useState } from "react";

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
};

export function WorkspaceCombobox({
  workspaces,
  selectedSlug,
  onSelect,
}: {
  workspaces: WorkspaceSummary[] | undefined;
  selectedSlug?: string;
  onSelect: (ws: WorkspaceSummary) => void;
}) {
  const [open, setOpen] = useState(false);

  const options = useMemo(
    () =>
      workspaces?.map((ws) => ({
        value: ws.slug,
        label: ws.name,
        icon: (
          <img
            src={ws.logo || `${OG_AVATAR_URL}${ws.name}`}
            alt={ws.name}
            className="size-4 rounded-full"
          />
        ),
      })),
    [workspaces],
  );

  const selected = useMemo(
    () => options?.find((o) => o.value === selectedSlug) ?? null,
    [options, selectedSlug],
  );

  return (
    <Combobox
      options={workspaces === undefined ? undefined : options}
      setSelected={(opt) => {
        const ws = workspaces?.find((w) => w.slug === opt.value);
        if (ws) onSelect(ws);
      }}
      selected={selected}
      icon={selected?.icon}
      caret
      placeholder={workspaces === undefined ? "" : "Select workspace"}
      searchPlaceholder="Search workspaces..."
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
          No workspaces found
        </div>
      }
    >
      {workspaces === undefined ? (
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
