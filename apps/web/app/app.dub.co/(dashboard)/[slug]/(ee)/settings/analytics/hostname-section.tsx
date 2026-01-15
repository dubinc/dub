"use client";

import { clientAccessCheck } from "@/lib/client-access-check";
import useWorkspace from "@/lib/swr/use-workspace";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { Button, CardList, Globe, InfoTooltip } from "@dub/ui";
import { cn } from "@dub/utils";
import { useState } from "react";
import { toast } from "sonner";
import { useAddHostnameModal } from "./add-hostname-modal";
import HostnameMenu from "./hostname-menu";

export const HostnameSection = ({ className }: { className?: string }) => {
  const { AddHostnameModal, setShowAddHostnameModal } = useAddHostnameModal();
  const { role, allowedHostnames, loading } = useWorkspace();

  const permissionsError = clientAccessCheck({
    action: "workspaces.write",
    role,
    customPermissionDescription: "manage allowed hostnames",
  }).error;

  let content;

  if (allowedHostnames && allowedHostnames.length > 0) {
    content = (
      <div className="grid grid-cols-1 gap-2">
        <CardList variant="compact" loading={loading}>
          {allowedHostnames?.map((hostname) => (
            <HostnameCard key={hostname} hostname={hostname} />
          ))}
        </CardList>
      </div>
    );
  } else {
    content = (
      <div className="flex items-center justify-center rounded-xl border border-neutral-200 bg-neutral-100 p-3">
        <p className="text-content-subtle text-sm font-medium">
          No hostnames added
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={cn("flex flex-col gap-2 p-3", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <h2 className="text-content-emphasis flex-1 text-sm font-semibold">
              Allowed hostnames
            </h2>
            <InfoTooltip content="Allowlist domains that you want to allow client-side click tracking on." />
          </div>

          <Button
            text="Add hostname"
            className="h-7 w-fit rounded-lg px-2.5 py-1 text-sm font-medium"
            onClick={() => setShowAddHostnameModal(true)}
            disabledTooltip={permissionsError || undefined}
          />
        </div>

        {content}
      </div>

      <AddHostnameModal />
    </>
  );
};

const HostnameCard = ({ hostname }: { hostname: string }) => {
  const { id, allowedHostnames, mutate, role } = useWorkspace();
  const [processing, setProcessing] = useState(false);

  const { allowed: canWriteWorkspaces } = clientAccessCheck({
    action: "workspaces.write",
    role,
    customPermissionDescription: "delete hostnames",
  });

  const handleDeleteHostname = async () => {
    setProcessing(true);

    const response = await fetch(`/api/workspaces/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        allowedHostnames: allowedHostnames?.filter((h) => h !== hostname),
      }),
    });

    if (response.ok) {
      toast.success("Hostname deleted.");
    } else {
      const { error } = await response.json();
      toast.error(error.message);
    }

    mutate();
    setProcessing(false);
  };

  const { setShowConfirmModal, confirmModal } = useConfirmModal({
    title: "Delete Hostname",
    description: `Are you sure you want to delete "${hostname}"? This action cannot be undone.`,
    confirmText: "Delete Hostname",
    onConfirm: handleDeleteHostname,
  });

  return (
    <CardList.Card
      key={hostname}
      innerClassName={cn(
        "flex items-center justify-between gap-5 sm:gap-8 md:gap-12 text-sm transition-opacity",
        processing && "opacity-50",
      )}
      hoverStateEnabled={false}
    >
      <div className="flex min-w-0 grow items-center gap-3">
        <div className="flex size-[28px] items-center justify-center rounded-md bg-neutral-100">
          <Globe className="size-4 text-neutral-800" />
        </div>

        <span className="min-w-0 truncate whitespace-nowrap font-medium text-neutral-800">
          {hostname}
        </span>
      </div>

      <div className="flex items-center gap-5 sm:gap-8 md:gap-12">
        {canWriteWorkspaces && (
          <HostnameMenu
            onDelete={() => setShowConfirmModal(true)}
            loading={processing}
          />
        )}
      </div>
      {confirmModal}
    </CardList.Card>
  );
};
