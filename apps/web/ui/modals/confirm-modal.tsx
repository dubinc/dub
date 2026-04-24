import { Button, Modal, useKeyboardShortcut } from "@dub/ui";
import { Dispatch, ReactNode, SetStateAction, useState } from "react";

type PromptModelProps = {
  title: string;
  description: ReactNode | string;

  onCancel?: () => void;
  cancelText?: string;

  onConfirm: () => Promise<void> | void;
  confirmText?: string;
  confirmVariant?: "primary" | "danger";

  confirmShortcut?: string;
  confirmShortcutOptions?: {
    modal?: boolean;
    sheet?: boolean;
  };
};

/**
 * A generic confirmation modal
 */
function ConfirmModal({
  showConfirmModal,
  setShowConfirmModal,
  title,
  description,
  onCancel,
  cancelText = "Cancel",
  onConfirm,
  confirmText = "Confirm",
  confirmVariant = "primary",
  confirmShortcut,
  confirmShortcutOptions = { modal: true },
}: {
  showConfirmModal: boolean;
  setShowConfirmModal: Dispatch<SetStateAction<boolean>>;
} & PromptModelProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      setShowConfirmModal(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      showModal={showConfirmModal}
      setShowModal={setShowConfirmModal}
      className="max-w-md"
    >
      {showConfirmModal && confirmShortcut && (
        <KeyboardShortcut
          confirmShortcut={confirmShortcut}
          onConfirm={handleConfirm}
          confirmShortcutOptions={confirmShortcutOptions}
        />
      )}
      <div className="divide-y divide-neutral-200">
        <div className="p-4 sm:px-6">
          <h3 className="text-content-emphasis text-lg font-medium">{title}</h3>
        </div>
        <div className="px-4 py-6 text-sm text-neutral-600 sm:px-6">
          {description}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-4 py-4 sm:px-6">
        <Button
          variant="secondary"
          className="h-8 w-fit"
          text={cancelText}
          onClick={() => {
            onCancel?.();
            setShowConfirmModal(false);
          }}
        />
        <Button
          variant={confirmVariant}
          className="h-8 w-fit"
          text={confirmText}
          loading={isLoading}
          shortcut={
            confirmShortcut === "Enter" ? "↵" : confirmShortcut?.toUpperCase()
          }
          onClick={handleConfirm}
        />
      </div>
    </Modal>
  );
}

function KeyboardShortcut({
  onConfirm,
  confirmShortcut,
  confirmShortcutOptions,
}: { confirmShortcut: string } & Pick<
  PromptModelProps,
  "onConfirm" | "confirmShortcutOptions"
>) {
  useKeyboardShortcut(confirmShortcut, onConfirm, confirmShortcutOptions);

  return null;
}

export function useConfirmModal(props: PromptModelProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  return {
    setShowConfirmModal,
    confirmModal: (
      <ConfirmModal
        showConfirmModal={showConfirmModal}
        setShowConfirmModal={setShowConfirmModal}
        {...props}
      />
    ),
  };
}
