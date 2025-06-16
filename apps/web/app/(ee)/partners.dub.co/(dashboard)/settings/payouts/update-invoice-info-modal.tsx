import { Button, Modal } from "@dub/ui";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";

type UpdateInvoiceInfoModalProps = {
  showUpdateInvoiceInfoModal: boolean;
  setShowUpdateInvoiceInfoModal: Dispatch<SetStateAction<boolean>>;
};

function UpdateInvoiceInfoModal(props: UpdateInvoiceInfoModalProps) {
  const { showUpdateInvoiceInfoModal, setShowUpdateInvoiceInfoModal } = props;

  return (
    <Modal
      showModal={showUpdateInvoiceInfoModal}
      setShowModal={setShowUpdateInvoiceInfoModal}
    >
      <UpdateInvoiceInfoModalInner {...props} />
    </Modal>
  );
}

function UpdateInvoiceInfoModalInner({
  setShowUpdateInvoiceInfoModal,
}: UpdateInvoiceInfoModalProps) {
  return (
    <>
      <div className="space-y-4 border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">Invoice info</h3>
        <p className="text-sm font-normal text-neutral-600">
          Add optional details to your payout invoices, like your business name,
          address, tax ID, or other info.
        </p>
      </div>

      <div className="flex flex-col gap-2 bg-neutral-50 p-4 sm:p-6">
        <label className="text-sm font-medium leading-5 text-neutral-900">
          Invoice info
        </label>
        <textarea
          required
          className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
          rows={3}
        />
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
        <Button
          variant="secondary"
          text="Cancel"
          className="h-8 w-fit px-3"
          onClick={() => setShowUpdateInvoiceInfoModal(false)}
        />

        <Button
          autoFocus
          text="Save"
          className="h-8 w-fit px-3"
          onClick={() => {}}
        />
      </div>
    </>
  );
}

export function useUpdateInvoiceInfoModal() {
  const [showUpdateInvoiceInfoModal, setShowUpdateInvoiceInfoModal] =
    useState(false);

  const UpdateInvoiceInfoModalCallback = useCallback(() => {
    return (
      <UpdateInvoiceInfoModal
        showUpdateInvoiceInfoModal={showUpdateInvoiceInfoModal}
        setShowUpdateInvoiceInfoModal={setShowUpdateInvoiceInfoModal}
      />
    );
  }, [showUpdateInvoiceInfoModal, setShowUpdateInvoiceInfoModal]);

  return useMemo(
    () => ({
      setShowUpdateInvoiceInfoModal,
      UpdateInvoiceInfoModal: UpdateInvoiceInfoModalCallback,
    }),
    [setShowUpdateInvoiceInfoModal, UpdateInvoiceInfoModalCallback],
  );
}
