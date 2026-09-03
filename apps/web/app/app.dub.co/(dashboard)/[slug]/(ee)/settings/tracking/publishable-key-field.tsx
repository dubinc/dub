"use client";

import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { Button, Copy, Key, Tick, Tooltip, useCopyToClipboard } from "@dub/ui";
import { nanoid } from "@dub/utils";
import {
  EmptyTrackingCard,
  emptyTrackingActionClassName,
} from "./empty-tracking-card";
import { PublishableKeyMenu } from "./publishable-key-menu";

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
  const [copied, copyToClipboard] = useCopyToClipboard();

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
        <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-neutral-100">
              <Key className="size-4 text-neutral-800" />
            </div>
            <code className="min-w-0 truncate font-mono text-sm text-neutral-800">
              {publishableKey}
            </code>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Tooltip content={copied ? "Key copied" : "Copy key"}>
              <button
                type="button"
                onClick={() => copyToClipboard(publishableKey)}
                className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-neutral-200 p-0 transition-colors duration-150 hover:bg-neutral-50 [&_svg]:size-3.5"
              >
                <span className="sr-only">Copy key</span>
                {copied ? (
                  <Tick className="text-neutral-800" />
                ) : (
                  <Copy className="text-neutral-800" />
                )}
              </button>
            </Tooltip>
            <Button
              text="Regenerate"
              variant="secondary"
              onClick={() => setShowGenerateModal(true)}
              disabled={disabled}
              disabledTooltip={disabledTooltip}
              className="h-7 w-fit shrink-0 px-2.5"
              textWrapperClassName="overflow-visible"
            />
            <PublishableKeyMenu
              onRevoke={() => setShowRevokeModal(true)}
              disabled={disabled}
              disabledTooltip={disabledTooltip}
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
