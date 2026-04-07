"use client";

import { MAX_FRAUD_REASON_LENGTH } from "@/lib/zod/schemas/partners";
import { Button, Icon, Modal, Popover } from "@dub/ui";
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
  const [reviewAction, setReviewAction] = useState<
    "confirmed" | "dismissed" | null
  >(null);
  const [reviewNote, setReviewNote] = useState("");

  const handleReview = async () => {
    if (!reviewAction) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/fraud-alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: reviewAction,
          ...(reviewNote.trim() && { reviewNote: reviewNote.trim() }),
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text);
      }

      setReviewAction(null);
      setReviewNote("");
      await onReviewed();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
                    setReviewAction("confirmed");
                    setIsOpen(false);
                  }}
                  disabled={isSubmitting}
                />
                <MenuItem
                  icon={CircleXmark}
                  label="Dismiss"
                  onSelect={() => {
                    setReviewAction("dismissed");
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

      <Modal
        showModal={reviewAction !== null}
        setShowModal={(show) => {
          if (!show) {
            setReviewAction(null);
            setReviewNote("");
          }
        }}
      >
        <div className="p-5 text-left">
          <h3 className="text-base font-semibold text-neutral-900">
            Review fraud alert
          </h3>

          <div className="mt-4">
            <label className="block text-sm font-medium text-neutral-900">
              Review note{" "}
              <span className="font-normal text-neutral-400">(optional)</span>
            </label>
            <textarea
              className="mt-1.5 block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
              placeholder="Add a note about this review..."
              rows={3}
              maxLength={MAX_FRAUD_REASON_LENGTH}
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
            />
            <p className="mt-1 text-right text-xs text-neutral-400">
              {reviewNote.length}/{MAX_FRAUD_REASON_LENGTH}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-5 py-4">
          <Button
            variant="secondary"
            className="h-8 w-fit px-3"
            text="Cancel"
            onClick={() => {
              setReviewAction(null);
              setReviewNote("");
            }}
          />
          <Button
            variant="primary"
            className="h-8 w-fit px-3"
            text={reviewAction === "confirmed" ? "Confirm fraud" : "Dismiss"}
            loading={isSubmitting}
            onClick={handleReview}
          />
        </div>
      </Modal>
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
