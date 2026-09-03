"use client";

import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { Button, Globe } from "@dub/ui";
import { cn } from "@dub/utils";
import { useAddHostnameModal } from "./add-hostname-modal";
import {
  EmptyTrackingCard,
  emptyTrackingActionClassName,
} from "./empty-tracking-card";
import { HostnameMenu } from "./hostname-menu";

export function HostnameField({
  hostnames,
  onChange,
  onSave,
  disabled,
  disabledTooltip,
}: {
  hostnames: string[];
  onChange: (hostnames: string[]) => void;
  onSave?: (hostnames: string[]) => void | Promise<void>;
  disabled?: boolean;
  disabledTooltip?: string;
}) {
  const { addHostnameModal, setShowAddHostnameModal } = useAddHostnameModal({
    existingHostnames: hostnames,
    onAdd: async (hostname) => {
      const nextHostnames = [...hostnames, hostname];
      await onSave?.(nextHostnames);
      onChange(nextHostnames);
    },
  });

  return (
    <>
      <div className="flex flex-col gap-2">
        {hostnames.length === 0 ? (
          <EmptyTrackingCard
            icon={<Globe className="size-[18px] shrink-0 text-neutral-600" />}
            text="No hostnames added"
            action={
              <Button
                text="Add hostname"
                variant="secondary"
                className={emptyTrackingActionClassName}
                textWrapperClassName="overflow-visible"
                onClick={() => setShowAddHostnameModal(true)}
                disabled={disabled}
                disabledTooltip={disabledTooltip}
              />
            }
          />
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {hostnames.map((hostname) => (
                <HostnameRow
                  key={hostname}
                  hostname={hostname}
                  disabled={disabled}
                  onDelete={async () => {
                    const nextHostnames = hostnames.filter(
                      (item) => item !== hostname,
                    );
                    await onSave?.(nextHostnames);
                    onChange(nextHostnames);
                  }}
                />
              ))}
            </div>
            <Button
              text="Add hostname"
              variant="secondary"
              className="h-8 w-fit shrink-0 px-3"
              textWrapperClassName="overflow-visible"
              onClick={() => setShowAddHostnameModal(true)}
              disabled={disabled}
              disabledTooltip={disabledTooltip}
            />
          </>
        )}
      </div>
      {addHostnameModal}
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
  onDelete: () => void | Promise<void>;
}) {
  const { setShowConfirmModal, confirmModal } = useConfirmModal({
    title: "Delete hostname",
    description: `Are you sure you want to delete "${hostname}"? This action cannot be undone.`,
    confirmText: "Delete hostname",
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
      {!disabled && <HostnameMenu onDelete={() => setShowConfirmModal(true)} />}
      {confirmModal}
    </div>
  );
}
