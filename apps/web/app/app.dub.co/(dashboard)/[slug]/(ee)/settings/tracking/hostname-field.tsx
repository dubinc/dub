"use client";

import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { Button, Globe } from "@dub/ui";
import { cn } from "@dub/utils";
import { useAddHostnameModal } from "./add-hostname-modal";
import HostnameMenu from "./hostname-menu";

export function HostnameField({
  hostnames,
  onChange,
  disabled,
  disabledTooltip,
}: {
  hostnames: string[];
  onChange: (hostnames: string[]) => void;
  disabled?: boolean;
  disabledTooltip?: string;
}) {
  const { AddHostnameModal, setShowAddHostnameModal } = useAddHostnameModal({
    existingHostnames: hostnames,
    onAdd: (hostname) => {
      onChange([...hostnames, hostname]);
    },
  });

  return (
    <>
      <div className="flex flex-col gap-2">
        {hostnames.length === 0 ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-100 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <Globe className="size-4 shrink-0 text-neutral-600" />
              <span className="text-content-subtle text-sm font-medium">
                No hostnames added
              </span>
            </div>
            <Button
              text="Add hostname"
              variant="secondary"
              className="h-8 w-fit px-2.5"
              onClick={() => setShowAddHostnameModal(true)}
              disabled={disabled}
              disabledTooltip={disabledTooltip}
            />
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {hostnames.map((hostname) => (
                <HostnameRow
                  key={hostname}
                  hostname={hostname}
                  disabled={disabled}
                  onDelete={() =>
                    onChange(hostnames.filter((item) => item !== hostname))
                  }
                />
              ))}
            </div>
            <Button
              text="Add hostname"
              variant="secondary"
              className="h-8 w-fit px-2.5"
              onClick={() => setShowAddHostnameModal(true)}
              disabled={disabled}
              disabledTooltip={disabledTooltip}
            />
          </>
        )}
      </div>
      <AddHostnameModal />
    </>
  );
}

function HostnameRow({
  hostname,
  disabled,
  onDelete,
}: {
  hostname: string;
  disabled?: boolean;
  onDelete: () => void;
}) {
  const { setShowConfirmModal, confirmModal } = useConfirmModal({
    title: "Delete Hostname",
    description: `Are you sure you want to delete "${hostname}"? This action cannot be undone.`,
    confirmText: "Delete Hostname",
    onConfirm: onDelete,
  });

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-2.5",
        disabled && "opacity-50",
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex size-7 items-center justify-center rounded-md bg-neutral-100">
          <Globe className="size-4 text-neutral-800" />
        </div>
        <span className="min-w-0 truncate text-sm font-medium text-neutral-800">
          {hostname}
        </span>
      </div>
      {!disabled && (
        <HostnameMenu
          onDelete={() => setShowConfirmModal(true)}
          loading={false}
        />
      )}
      {confirmModal}
    </div>
  );
}
