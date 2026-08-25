"use client";

import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { Button, CopyButton, Key } from "@dub/ui";
import { nanoid } from "@dub/utils";
import {
  EmptyTrackingCard,
  emptyTrackingActionClassName,
} from "./empty-tracking-card";
import PublishableKeyMenu from "./publishable-key-menu";

export function PublishableKeyField({
  publishableKey,
  onChange,
  disabled,
  disabledTooltip,
}: {
  publishableKey: string | null;
  onChange: (publishableKey: string | null) => void;
  disabled?: boolean;
  disabledTooltip?: string;
}) {
  const generateKey = () => `dub_pk_${nanoid(24)}`;

  const {
    setShowConfirmModal: setShowGenerateModal,
    confirmModal: generateModal,
  } = useConfirmModal({
    title: "Generate New Publishable Key",
    description: publishableKey
      ? "Are you sure you want to generate a new publishable key? This will invalidate the existing key after you save."
      : "This key will provide access to your workspace's conversion tracking endpoints.",
    confirmText: "Generate Key",
    onConfirm: () => onChange(generateKey()),
  });

  const { setShowConfirmModal: setShowRevokeModal, confirmModal: revokeModal } =
    useConfirmModal({
      title: "Revoke Publishable Key",
      description:
        "Are you sure you want to revoke the publishable key? This action cannot be undone after you save.",
      confirmText: "Revoke Key",
      onConfirm: () => onChange(null),
    });

  return (
    <>
      {publishableKey ? (
        <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-neutral-100">
              <Key className="size-4 text-neutral-800" />
            </div>
            <code className="min-w-0 truncate font-mono text-sm text-neutral-800">
              {publishableKey}
            </code>
            <CopyButton value={publishableKey} className="shrink-0" />
          </div>
          <div className="flex w-fit items-center gap-2 sm:shrink-0">
            <Button
              text="Regenerate"
              variant="secondary"
              onClick={() => setShowGenerateModal(true)}
              disabled={disabled}
              disabledTooltip={disabledTooltip}
              className="h-7 w-fit px-2 text-xs"
            />
            <PublishableKeyMenu
              onRevoke={() => setShowRevokeModal(true)}
              loading={false}
            />
          </div>
        </div>
      ) : (
        <EmptyTrackingCard
          icon={<Key className="size-[18px] shrink-0 text-neutral-600" />}
          text="No publishable key generated"
          action={
            <Button
              text="Generate key"
              className={emptyTrackingActionClassName}
              textWrapperClassName="overflow-visible"
              onClick={() => setShowGenerateModal(true)}
              disabled={disabled}
              disabledTooltip={disabledTooltip}
            />
          }
        />
      )}
      {generateModal}
      {revokeModal}
    </>
  );
}
