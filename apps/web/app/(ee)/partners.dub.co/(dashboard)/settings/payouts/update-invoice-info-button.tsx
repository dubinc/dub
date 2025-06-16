"use client";

import { Button } from "@dub/ui";
import { useUpdateInvoiceInfoModal } from "./update-invoice-info-modal";

export function UpdateInvoiceInfoButton() {
  const { UpdateInvoiceInfoModal, setShowUpdateInvoiceInfoModal } =
    useUpdateInvoiceInfoModal();

  return (
    <>
      <UpdateInvoiceInfoModal />
      <Button
        type="button"
        text="Invoice info"
        variant="secondary"
        onClick={() => setShowUpdateInvoiceInfoModal(true)}
      />
    </>
  );
}
