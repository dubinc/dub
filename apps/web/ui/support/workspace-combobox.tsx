"use client";

import { WorkspaceEnvironmentIndicator } from "@/lib/sandbox/components/workspace-environment-indicator";
import { isStagingEnvironment } from "@/lib/sandbox/environment";
import { Combobox } from "@dub/ui";
import { cn, OG_AVATAR_URL } from "@dub/utils";
import { WorkspaceEnvironment } from "@prisma/client";
import { useMemo, useState } from "react";

export const DEFAULT_WORKSPACE_ENVIRONMENTS: WorkspaceEnvironment[] = [
  WorkspaceEnvironment.production,
  WorkspaceEnvironment.sandbox,
];

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  environment?: WorkspaceEnvironment;
};

// TODO: consolidate with WorkspaceSelector
export function WorkspaceCombobox({
  workspaces,
  selectedSlug,
  onSelect,
  environments = DEFAULT_WORKSPACE_ENVIRONMENTS,
}: {
  workspaces: WorkspaceSummary[] | undefined;
  selectedSlug?: string;
  onSelect: (ws: WorkspaceSummary) => void;
  environments?: WorkspaceEnvironment[]; // only display workspaces in these environments (defaults to production and sandbox)
}) {
  const [open, setOpen] = useState(false);

  const filteredWorkspaces = useMemo(() => {
    if (!workspaces) {
      return workspaces;
    }

    return workspaces.filter((workspace) =>
      environments
        ? workspace.environment && environments.includes(workspace.environment)
        : !isStagingEnvironment(workspace.environment),
    );
  }, [workspaces, environments]);

  const options = useMemo(
    () =>
      filteredWorkspaces?.map((ws) => ({
        value: ws.slug,
        label: ws.name,
        icon: (
          <img
            src={ws.logo || `${OG_AVATAR_URL}${encodeURIComponent(ws.name)}`}
            alt={ws.name}
            className="size-3.5 rounded-full"
          />
        ),
      })),
    [filteredWorkspaces],
  );

  const selected = useMemo(
    () => options?.find((o) => o.value === selectedSlug) ?? null,
    [options, selectedSlug],
  );

  const environmentBySlug = useMemo(
    () =>
      new Map(
        (filteredWorkspaces ?? []).map((workspace) => [
          workspace.slug,
          workspace.environment,
        ]),
      ),
    [filteredWorkspaces],
  );

  return (
    <Combobox
      forceDropdown
      options={filteredWorkspaces === undefined ? undefined : options}
      setSelected={(opt) => {
        if (!opt) return;
        const ws = filteredWorkspaces?.find((w) => w.slug === opt.value);
        if (ws) onSelect(ws);
      }}
      selected={selected}
      icon={selected?.icon}
      caret
      placeholder={filteredWorkspaces === undefined ? "" : "Select workspace"}
      searchPlaceholder="Search workspaces..."
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
      optionRight={(option) => (
        <WorkspaceEnvironmentIndicator
          environment={environmentBySlug.get(option.value)}
        />
      )}
      emptyState={
        <div className="flex w-full flex-col items-center gap-2 py-3 text-xs text-neutral-500">
          No workspaces found
        </div>
      }
    >
      {filteredWorkspaces === undefined ? (
        <div className="flex items-center gap-1.5 text-sm">
          <div className="size-3.5 animate-pulse rounded-full bg-neutral-200" />
          <div className="h-3.5 w-24 animate-pulse rounded bg-neutral-200" />
        </div>
      ) : selected ? (
        <span className="flex w-full min-w-0 items-center gap-1.5">
          <span className="min-w-0 truncate">{selected.label}</span>
          <WorkspaceEnvironmentIndicator
            environment={environmentBySlug.get(selected.value)}
          />
        </span>
      ) : null}
    </Combobox>
  );
}
