"use client";

import { clientAccessCheck } from "@/lib/client-access-check";
import useWorkspace from "@/lib/swr/use-workspace";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { Button, CopyButton, InfoTooltip, Key } from "@dub/ui";
import { cn, nanoid } from "@dub/utils";
import { useState } from "react";
import { toast } from "sonner";
import PublishableKeyMenu from "./publishable-key-menu";

export const PublishableKeyForm = ({ className }: { className?: string }) => {
  const { id, publishableKey, mutate, role } = useWorkspace();
  const [processing, setProcessing] = useState(false);

  const { error: permissionsError } = clientAccessCheck({
    action: "workspaces.write",
    role,
    customPermissionDescription: "manage publishable keys",
  });

  const handleGenerateKey = async () => {
    setProcessing(true);

    const newPublishableKey = `dub_pk_${nanoid(24)}`;

    const response = await fetch(`/api/workspaces/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        publishableKey: newPublishableKey,
      }),
    });

    if (response.ok) {
      toast.success("Publishable key generated successfully.");
    } else {
      const { error } = await response.json();
      toast.error(error.message);
    }

    mutate();
    setProcessing(false);
  };

  const handleRevokeKey = async () => {
    setProcessing(true);

    const response = await fetch(`/api/workspaces/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        publishableKey: null,
      }),
    });

    if (response.ok) {
      toast.success("Publishable key revoked successfully.");
    } else {
      const { error } = await response.json();
      toast.error(error.message);
    }

    mutate();
    setProcessing(false);
  };

  const {
    setShowConfirmModal: setShowGenerateModal,
    confirmModal: generateModal,
  } = useConfirmModal({
    title: "Generate New Publishable Key",
    description: `Are you sure you want to generate a new publishable key? ${publishableKey ? "This will invalidate the existing key." : "This key will provide access to your workspace's conversion tracking endpoints."}`,
    confirmText: "Generate Key",
    onConfirm: handleGenerateKey,
  });

  const { setShowConfirmModal: setShowRevokeModal, confirmModal: revokeModal } =
    useConfirmModal({
      title: "Revoke Publishable Key",
      description:
        "Are you sure you want to revoke the publishable key? This action cannot be undone.",
      confirmText: "Revoke Key",
      onConfirm: handleRevokeKey,
    });

  return (
    <div className={cn("flex flex-col gap-2 p-3", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1">
          <h2 className="text-content-emphasis flex-1 text-sm font-semibold">
            Publishable key
          </h2>
          <InfoTooltip content="For authenticating requests when tracking conversion events on the client-side. [Learn more.](https://dub.co/docs/api-reference/publishable-keys)" />
        </div>

        {!publishableKey && (
          <Button
            text="Generate"
            className="h-7 w-fit rounded-lg px-2.5 py-1 text-sm font-medium"
            onClick={() => setShowGenerateModal(true)}
            loading={processing}
            disabledTooltip={permissionsError || undefined}
          />
        )}
      </div>

      {publishableKey ? (
        <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex size-[28px] items-center justify-center rounded-md bg-neutral-100">
                <Key className="size-4 text-neutral-800" />
              </div>
              <code className="min-w-0 flex-1 truncate font-mono text-sm text-neutral-800">
                {publishableKey}
              </code>
            </div>
            <CopyButton value={publishableKey} className="shrink-0" />
          </div>
          <div className="flex w-fit items-center gap-2 sm:shrink-0">
            <Button
              text="Regenerate"
              variant="secondary"
              onClick={() => setShowGenerateModal(true)}
              loading={processing}
              disabledTooltip={permissionsError || undefined}
              className="h-7 w-fit flex-1 px-2 text-xs sm:flex-none"
            />
            <PublishableKeyMenu
              onRevoke={() => setShowRevokeModal(true)}
              loading={processing}
            />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-xl border border-neutral-200 bg-neutral-100 p-3">
          <p className="text-content-subtle text-sm font-medium">
            No publishable key created
          </p>
        </div>
      )}
      {generateModal}
      {revokeModal}
    </div>
  );
};
