"use client";

import { clientAccessCheck } from "@/lib/api/tokens/permissions";
import useWorkspace from "@/lib/swr/use-workspace";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { Button, CopyButton } from "@dub/ui";
import { nanoid } from "@dub/utils";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

export const PublishableKeyForm = () => {
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
    <div className="rounded-lg border border-neutral-200 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-tight text-black">
            Publishable Key
          </h2>
          <p className="text-sm text-neutral-500">
            Use this key for client-side conversion tracking.{" "}
            <Link
              href="https://dub.co/docs/sdks/client-side/features/conversion-tracking"
              target="_blank"
              className="underline transition-colors hover:text-neutral-800"
            >
              Learn more.
            </Link>
          </p>
        </div>
        {!publishableKey && (
          <Button
            text="Generate Key"
            className="h-8 w-fit px-3 sm:shrink-0"
            onClick={() => setShowGenerateModal(true)}
            loading={processing}
            disabledTooltip={permissionsError || undefined}
          />
        )}
      </div>

      {publishableKey ? (
        <div className="mt-5 space-y-3">
          <div className="flex flex-col gap-3 rounded-md border border-neutral-200 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <code className="min-w-0 flex-1 truncate font-mono text-sm text-neutral-800">
                {publishableKey}
              </code>
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
              <Button
                text="Revoke"
                variant="danger"
                onClick={() => setShowRevokeModal(true)}
                loading={processing}
                disabledTooltip={permissionsError || undefined}
                className="h-7 w-fit flex-1 px-2 text-xs sm:flex-none"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <div className="flex items-center justify-center rounded-md border border-dashed border-neutral-300 p-8">
            <p className="text-sm text-neutral-500">
              No publishable key configured
            </p>
          </div>
        </div>
      )}
      {generateModal}
      {revokeModal}
    </div>
  );
};
