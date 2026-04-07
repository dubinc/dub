"use client";

import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { Button, Icon, Popover } from "@dub/ui";
import { CircleCheck, CircleXmark, Dots } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { Command } from "cmdk";
import { useState } from "react";
import { toast } from "sonner";

export function ReviewFraudAlertMenu({
  alertId,
  onReviewed,
}: {
  alertId: string;
  onReviewed: () => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReview = async (status: "confirmed" | "dismissed") => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/fraud-alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      toast.success(
        status === "confirmed"
          ? "Partner marked as fraudulent and banned from all programs."
          : "Fraud alert dismissed.",
      );
      await onReviewed();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const {
    confirmModal: confirmFraudModal,
    setShowConfirmModal: setShowConfirmFraudModal,
  } = useConfirmModal({
    title: "Confirm fraud",
    description:
      "This will permanently mark the partner as fraudulent and ban them from ALL programs across the network. This action cannot be undone.",
    onConfirm: () => handleReview("confirmed"),
    confirmText: "Confirm fraud",
    confirmVariant: "danger",
  });

  const {
    confirmModal: dismissModal,
    setShowConfirmModal: setShowDismissModal,
  } = useConfirmModal({
    title: "Dismiss fraud alert",
    description:
      "This will dismiss the fraud alert. The partner ban will remain unchanged.",
    onConfirm: () => handleReview("dismissed"),
    confirmText: "Dismiss",
  });

  return (
    <>
      <Popover
        openPopover={isOpen}
        setOpenPopover={setIsOpen}
        content={
          <Command tabIndex={0} loop className="pointer-events-auto">
            <Command.List className="flex w-screen flex-col gap-1 text-sm focus-visible:outline-none sm:w-auto sm:min-w-[180px]">
              <Command.Group className="p-1.5">
                <MenuItem
                  icon={CircleCheck}
                  label="Confirm fraud"
                  onSelect={() => {
                    setShowConfirmFraudModal(true);
                    setIsOpen(false);
                  }}
                  disabled={isSubmitting}
                />
                <MenuItem
                  icon={CircleXmark}
                  label="Dismiss"
                  onSelect={() => {
                    setShowDismissModal(true);
                    setIsOpen(false);
                  }}
                  disabled={isSubmitting}
                />
              </Command.Group>
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
      {confirmFraudModal}
      {dismissModal}
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
