"use client";

import { updateAutoApprovePartnersAction } from "@/lib/actions/partners/update-auto-approve-partners";
import { mutatePrefix } from "@/lib/swr/mutate";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { ThreeDots } from "@/ui/shared/icons";
import {
  Button,
  LoadingSpinner,
  MenuItem,
  Popover,
  UserCheck,
  UserXmark,
} from "@dub/ui";
import { Command } from "cmdk";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function ApplicationsMenu() {
  const router = useRouter();

  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();
  const { program } = useProgram();

  const [isOpen, setIsOpen] = useState(false);

  const { executeAsync: updateAutoApprove, isPending: isUpdatingAutoApprove } =
    useAction(updateAutoApprovePartnersAction, {
      onError: ({ error }) => {
        toast.error(error.serverError);
      },
      onSuccess: ({ input }) => {
        toast.success(
          `Auto-approve ${input.autoApprovePartners ? "enabled" : "disabled"}`,
        );
        mutatePrefix(["/api/partners", "/api/programs"]);
      },
    });

  const {
    confirmModal: confirmEnableAutoApproveModal,
    setShowConfirmModal: setShowConfirmEnableAutoApproveModal,
  } = useConfirmModal({
    title: "Confirm auto-approve",
    description: "New applications will be automatically approved.",
    onConfirm: async () => {
      await updateAutoApprove({
        workspaceId: workspaceId!,
        autoApprovePartners: true,
      });
    },
  });

  const {
    confirmModal: confirmDisableAutoApproveModal,
    setShowConfirmModal: setShowConfirmDisableAutoApproveModal,
  } = useConfirmModal({
    title: "Disable auto-approve",
    description:
      "Future applications will no longer be automatically approved.",
    onConfirm: async () => {
      await updateAutoApprove({
        workspaceId: workspaceId!,
        autoApprovePartners: false,
      });
    },
  });

  return (
    <>
      {confirmEnableAutoApproveModal}
      {confirmDisableAutoApproveModal}
      <Popover
        openPopover={isOpen}
        setOpenPopover={setIsOpen}
        content={
          <Command tabIndex={0} loop className="focus:outline-none">
            <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm focus-visible:outline-none sm:w-auto sm:min-w-[200px]">
              {program?.autoApprovePartnersEnabledAt ? (
                <MenuItem
                  as={Command.Item}
                  icon={<UserCheck className="size-4 shrink-0 text-red-600" />}
                  onSelect={() => {
                    setShowConfirmDisableAutoApproveModal(true);
                    setIsOpen(false);
                  }}
                >
                  Disable auto-approve
                </MenuItem>
              ) : (
                <MenuItem
                  as={Command.Item}
                  icon={
                    <UserCheck className="size-4 shrink-0 text-green-600" />
                  }
                  onSelect={() => {
                    setShowConfirmEnableAutoApproveModal(true);
                    setIsOpen(false);
                  }}
                >
                  Enable auto-approve
                </MenuItem>
              )}
              <MenuItem
                as={Command.Item}
                icon={UserXmark}
                onSelect={() => {
                  router.push(
                    `/${workspaceSlug}/program/partners/applications/rejected`,
                  );
                  setIsOpen(false);
                }}
              >
                View rejected partners
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
          disabled={isUpdatingAutoApprove || !program}
          icon={
            isUpdatingAutoApprove ? (
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
