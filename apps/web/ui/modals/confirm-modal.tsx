import { Button, Modal } from "@dub/ui";
import { Dispatch, ReactNode, SetStateAction, useState } from "react";

type PromptModelProps = {
  title: string;
  description?: ReactNode;

  onCancel?: () => void;
  cancelText?: string;

  onConfirm: () => Promise<void> | void;
  confirmText?: string;
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
}: {
  showConfirmModal: boolean;
  setShowConfirmModal: Dispatch<SetStateAction<boolean>>;
} & PromptModelProps) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <Modal showModal={showConfirmModal} setShowModal={setShowConfirmModal}>
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
          onClick={async () => {
            setIsLoading(true);
            await onConfirm();
            setIsLoading(false);
            setShowConfirmModal(false);
          }}
        />
      </div>
    </Modal>
  );
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
