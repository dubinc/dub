import { Button, Modal, useKeyboardShortcut } from "@dub/ui";
import { Dispatch, ReactNode, SetStateAction, useState } from "react";

type PromptModelProps = {
  title: string;
  description?: ReactNode;

  onCancel?: () => void;
  cancelText?: string;

  onConfirm: () => Promise<void> | void;
  confirmText?: string;

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
    <Modal showModal={showConfirmModal} setShowModal={setShowConfirmModal}>
      {showConfirmModal && confirmShortcut && (
        <KeyboardShortcut
          confirmShortcut={confirmShortcut}
          onConfirm={handleConfirm}
          confirmShortcutOptions={confirmShortcutOptions}
        />
      )}
      <div className="p-5 text-left">
        <h3 className="text-content-emphasis text-base font-semibold">
          {title}
        </h3>
        {description && (
          <p className="text-content-subtle mt-1 text-sm">{description}</p>
        )}
      </div>

      <div className="border-border-subtle flex items-center justify-end gap-2 border-t px-5 py-4">
        <Button
          variant="secondary"
          className="h-8 w-fit px-3"
          text={cancelText}
          onClick={() => {
            onCancel?.();
            setShowConfirmModal(false);
          }}
        />
        <Button
          variant="primary"
          className="h-8 w-fit px-3"
          text={confirmText}
          loading={isLoading}
          shortcut={confirmShortcut?.toUpperCase()}
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
