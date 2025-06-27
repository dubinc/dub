"use client";

import { Button } from "@dub/ui";
import { useUpdateInvoiceSettingsModal } from "./update-invoice-settings-modal";

export function InvoiceSettingsButton() {
  const { UpdateInvoiceSettingsModal, setShowUpdateInvoiceSettingsModal } =
    useUpdateInvoiceSettingsModal();

  return (
    <>
      <UpdateInvoiceSettingsModal />
      <Button
        type="button"
        text="Invoice settings"
        variant="secondary"
        onClick={() => setShowUpdateInvoiceSettingsModal(true)}
      />
    </>
  );
}
