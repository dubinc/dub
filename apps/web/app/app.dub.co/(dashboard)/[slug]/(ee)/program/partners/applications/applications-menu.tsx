"use client";

import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { ThreeDots } from "@/ui/shared/icons";
import { Button, LoadingSpinner, MenuItem, Popover, UserCheck } from "@dub/ui";
import { Command } from "cmdk";
import { useState } from "react";
import { toast } from "sonner";

export function ApplicationsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const isLoading = false;

  const { confirmModal, setShowConfirmModal } = useConfirmModal({
    title: "Confirm auto-approve",
    description:
      "Current and future applications will be automatically approved.",
    onConfirm: () => {
      toast.info("WIP");
    },
  });

  return (
    <>
      {confirmModal}
      <Popover
        openPopover={isOpen}
        setOpenPopover={setIsOpen}
        content={
          <Command tabIndex={0} loop className="focus:outline-none">
            <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm focus-visible:outline-none sm:w-auto sm:min-w-[200px]">
              <MenuItem
                as={Command.Item}
                icon={<UserCheck className="size-4 shrink-0 text-green-600" />}
                onSelect={() => {
                  setShowConfirmModal(true);
                  setIsOpen(false);
                }}
              >
                Enable auto-approve
              </MenuItem>
            </Command.List>
          </Command>
        }
        align="end"
      >
        <Button
          type="button"
          className="h-8 whitespace-nowrap px-2"
          variant="secondary"
          icon={
            isLoading ? (
              <LoadingSpinner className="size-4 shrink-0" />
            ) : (
              <ThreeDots className="size-4 shrink-0" />
            )
          }
        />
      </Popover>
    </>
  );
}
