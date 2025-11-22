"use client";

import { updateAutoApprovePartnersAction } from "@/lib/actions/partners/update-auto-approve-partners";
import { mutatePrefix } from "@/lib/swr/mutate";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { useExportApplicationsModal } from "@/ui/modals/export-applications-modal";
import { ThreeDots } from "@/ui/shared/icons";
import { Button, LoadingSpinner, Popover, UserCheck, UserXmark } from "@dub/ui";
import { Download } from "@dub/ui/icons";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
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

  const { setShowExportApplicationsModal, ExportApplicationsModal } =
    useExportApplicationsModal();

  return (
    <>
      {confirmEnableAutoApproveModal}
      {confirmDisableAutoApproveModal}
      <ExportApplicationsModal />
      <Popover
        openPopover={isOpen}
        setOpenPopover={setIsOpen}
        content={
          <div className="w-full md:w-56">
            <div className="grid gap-px p-2">
              <p className="mb-1.5 mt-1 flex items-center gap-2 px-1 text-xs font-medium text-neutral-500">
                Application Settings
              </p>
              <Link
                href={`/${workspaceSlug}/program/groups/${DEFAULT_PARTNER_GROUP.slug}/settings`}
                className="w-full rounded-md p-2 hover:bg-neutral-100 active:bg-neutral-200"
              >
                <div className="flex items-center gap-2 text-left">
                  <UserCheck className="size-4 shrink-0" />
                  <span className="text-sm font-medium">
                    Auto-approval settings
                  </span>
                </div>
              </Link>
              <button
                onClick={() => {
                  router.push(
                    `/${workspaceSlug}/program/partners/applications/rejected`,
                  );
                  setIsOpen(false);
                }}
                className="w-full rounded-md p-2 hover:bg-neutral-100 active:bg-neutral-200"
              >
                <div className="flex items-center gap-2 text-left">
                  <UserXmark className="size-4 shrink-0" />
                  <span className="text-sm font-medium">
                    View rejected partners
                  </span>
                </div>
              </button>
            </div>

            <div className="border-t border-neutral-200" />

            <div className="grid gap-px p-2">
              <p className="mb-1.5 mt-1 flex items-center gap-2 px-1 text-xs font-medium text-neutral-500">
                Export Applications
              </p>
              <button
                onClick={() => {
                  setShowExportApplicationsModal(true);
                  setIsOpen(false);
                }}
                className="w-full rounded-md p-2 hover:bg-neutral-100 active:bg-neutral-200"
              >
                <div className="flex items-center gap-2 text-left">
                  <Download className="size-4 shrink-0" />
                  <span className="text-sm font-medium">Export as CSV</span>
                </div>
              </button>
            </div>
          </div>
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
