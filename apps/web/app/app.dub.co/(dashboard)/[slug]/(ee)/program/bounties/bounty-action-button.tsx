"use client";

import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { BountyExtendedProps } from "@/lib/types";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { ThreeDots } from "@/ui/shared/icons";
import { Button, MenuItem, Popover } from "@dub/ui";
import { PenWriting, Trash } from "@dub/ui/icons";
import { Command } from "cmdk";
import { useState } from "react";
import { toast } from "sonner";
import { useBountySheet } from "./add-edit-bounty-sheet";

interface BountyActionButtonProps {
  bounty: BountyExtendedProps;
  className?: string;
  buttonClassName?: string;
}

export function BountyActionButton({
  bounty,
  className,
  buttonClassName,
}: BountyActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { id: workspaceId } = useWorkspace();
  const { setShowCreateBountySheet, BountySheet } = useBountySheet({ bounty });

  const { confirmModal: deleteModal, setShowConfirmModal: setShowDeleteModal } =
    useConfirmModal({
      title: "Delete bounty",
      description:
        "Are you sure you want to delete this bounty? This action is irreversible – please proceed with caution.",
      onConfirm: async () => {
        const response = await fetch(
          `/api/bounties/${bounty.id}?workspaceId=${workspaceId}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        if (!response.ok) {
          const { error } = await response.json();
          toast.error(error.message);
          return;
        }

        await mutatePrefix("/api/bounties");
        toast.success("Bounty deleted successfully!");
      },
    });

  return (
    <>
      {BountySheet}
      {deleteModal}
      <div className={className}>
        <Popover
          openPopover={isOpen}
          setOpenPopover={setIsOpen}
          content={
            <Command tabIndex={0} loop className="focus:outline-none">
              <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm focus-visible:outline-none sm:w-auto sm:min-w-[200px]">
                <MenuItem
                  as={Command.Item}
                  icon={PenWriting}
                  variant="default"
                  onSelect={() => {
                    setShowCreateBountySheet(true);
                    setIsOpen(false);
                  }}
                >
                  Edit bounty
                </MenuItem>

                <MenuItem
                  as={Command.Item}
                  icon={Trash}
                  variant="danger"
                  onSelect={() => {
                    setIsOpen(false);
                    setShowDeleteModal(true);
                  }}
                  disabledTooltip={
                    bounty.submissionsCount > 0
                      ? "Bounties with submissions cannot be deleted."
                      : undefined
                  }
                >
                  Delete bounty
                </MenuItem>
              </Command.List>
            </Command>
          }
          align="end"
        >
          <Button
            type="button"
            className={buttonClassName || "w-auto px-1.5"}
            variant="secondary"
            icon={<ThreeDots className="h-4 w-4 shrink-0" />}
          />
        </Popover>
      </div>
    </>
  );
}
