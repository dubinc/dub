import { CommissionResponse } from "@/lib/types";
import { Button, Icon, Popover, useCopyToClipboard } from "@dub/ui";
import { CircleCheck, Dots, InvoiceDollar, Pen2 } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { Row } from "@tanstack/react-table";
import { Command } from "cmdk";
import { useState } from "react";
import { toast } from "sonner";
import { useEditCommissionModal } from "./edit-commission-modal";

export function CommissionRowMenu({ row }: { row: Row<CommissionResponse> }) {
  const [isOpen, setIsOpen] = useState(false);

  const { openEditCommissionModal, EditCommissionModal } =
    useEditCommissionModal();

  const [copiedInvoiceId, copyInvoiceIdToClipboard] = useCopyToClipboard();

  const showUpdateActions = row.original.status !== "paid";

  if (!showUpdateActions && !row.original.invoiceId) {
    return null;
  }

  return (
    <>
      <EditCommissionModal />
      <Popover
        openPopover={isOpen}
        setOpenPopover={setIsOpen}
        content={
          <Command tabIndex={0} loop className="pointer-events-auto">
            <Command.List className="flex w-screen flex-col gap-1 text-sm focus-visible:outline-none sm:w-auto sm:min-w-[180px]">
              {showUpdateActions && (
                <Command.Group className="p-1.5">
                  <MenuItem
                    icon={Pen2}
                    label="Edit commission"
                    onSelect={() => {
                      openEditCommissionModal(row.original);
                      setIsOpen(false);
                    }}
                  />
                </Command.Group>
              )}
              {row.original.invoiceId && (
                <>
                  <Command.Separator className="w-full border-t border-neutral-200" />
                  <Command.Group className="p-1.5">
                    <MenuItem
                      icon={copiedInvoiceId ? CircleCheck : InvoiceDollar}
                      label="Copy invoice ID"
                      onSelect={() => {
                        copyInvoiceIdToClipboard(row.original.invoiceId!);
                        toast.success("Invoice ID copied to clipboard");
                      }}
                    />
                  </Command.Group>
                </>
              )}
            </Command.List>
          </Command>
        }
        align="end"
      >
        <Button
          type="button"
          className="size-8 shrink-0 whitespace-nowrap rounded-lg p-0"
          variant="outline"
          icon={<Dots className="h-4 w-4 shrink-0" />}
        />
      </Popover>
    </>
  );
}

function MenuItem({
  icon: IconComp,
  label,
  onSelect,
  disabled,
}: {
  icon: Icon;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <Command.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-md p-2 text-sm text-neutral-600",
        "data-[selected=true]:bg-neutral-100",
        disabled && "cursor-not-allowed opacity-50",
      )}
      onSelect={onSelect}
      disabled={disabled}
    >
      <IconComp className="size-4 shrink-0 text-neutral-500" />
      {label}
    </Command.Item>
  );
}
