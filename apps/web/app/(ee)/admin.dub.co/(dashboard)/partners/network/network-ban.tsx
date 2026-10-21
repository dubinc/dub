"use client";

import { AdminNetworkPartner } from "@/lib/types";
import { MAX_FRAUD_REASON_LENGTH } from "@/lib/zod/schemas/partners";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { Button, Modal } from "@dub/ui";
import { UserXmark } from "@dub/ui/icons";
import { useState } from "react";
import { toast } from "sonner";

type NetworkBanResponse = {
  fraudAlertCreated: boolean;
  fraudAlertSkippedReason?: "already_flagged" | "no_active_enrollments";
  alertedProgramsCount: number;
};

function getBanSuccessMessage({
  fraudAlertCreated,
  fraudAlertSkippedReason,
  alertedProgramsCount,
}: NetworkBanResponse) {
  if (fraudAlertCreated) {
    return alertedProgramsCount > 0
      ? `Fraud confirmed and partner banned. ${alertedProgramsCount} program${alertedProgramsCount === 1 ? "" : "s"} alerted.`
      : "Fraud confirmed and partner banned. No other enrolled programs to alert.";
  }

  return fraudAlertSkippedReason === "already_flagged"
    ? "Partner banned. They were already flagged for fraud, so no new fraud alert was created."
    : "Partner banned. No fraud alert was created because they have no active program enrollments.";
}

export function NetworkBan({
  partner,
  onChange,
}: {
  partner: Pick<AdminNetworkPartner, "id" | "networkStatus">;
  onChange: () => Promise<void>;
}) {
  const [showBanModal, setShowBanModal] = useState(false);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isBanned = partner.networkStatus === "banned";

  const handleBan = async () => {
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/admin/partners/${partner.id}/network-ban`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: reason.trim() }),
        },
      );

      if (!response.ok) {
        throw new Error((await response.text()) || "Failed to ban partner.");
      }

      toast.success(getBanSuccessMessage(await response.json()));
      setShowBanModal(false);
      setReason("");
      await onChange();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to ban partner.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnban = async () => {
    try {
      const response = await fetch(
        `/api/admin/partners/${partner.id}/network-ban`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error((await response.text()) || "Failed to unban partner.");
      }

      toast.success("Partner unbanned from the Dub Partner Network.");
      await onChange();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to unban partner.",
      );
    }
  };

  const { setShowConfirmModal: setShowUnbanModal, confirmModal: unbanModal } =
    useConfirmModal({
      title: "Unban from network",
      description:
        "This will move the partner's network profile back to draft. Payouts are enabled again if a payout method is still active.",
      confirmText: "Unban",
      onConfirm: handleUnban,
    });

  return (
    <>
      {unbanModal}
      <Modal
        showModal={showBanModal}
        setShowModal={setShowBanModal}
        className="max-w-md"
      >
        <div className="border-b border-neutral-200 p-4 sm:px-6">
          <h3 className="text-content-emphasis text-lg font-medium">
            Ban from network
          </h3>
        </div>
        <div className="flex flex-col gap-4 px-4 py-6 sm:px-6">
          <p className="text-sm text-neutral-600">
            This will confirm fraud for this partner, alert their enrolled
            programs through the network-level ban risk rule, and ban them from
            the Dub Partner Network. Their payouts are disabled and new program
            applications are blocked.
          </p>
          <div>
            <label className="block text-sm font-medium text-neutral-900">
              Fraud reason
            </label>
            <textarea
              className="mt-1.5 block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
              placeholder="Describe why this partner is banned..."
              rows={4}
              maxLength={MAX_FRAUD_REASON_LENGTH}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <p className="mt-1 text-right text-xs text-neutral-400">
              {reason.length}/{MAX_FRAUD_REASON_LENGTH}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-4 py-4 sm:px-6">
          <Button
            variant="secondary"
            className="h-8 w-fit"
            text="Cancel"
            disabled={isSubmitting}
            onClick={() => setShowBanModal(false)}
          />
          <Button
            variant="danger"
            className="h-8 w-fit"
            text="Ban from network"
            loading={isSubmitting}
            disabledTooltip={
              reason.trim().length === 0
                ? "Enter a fraud reason to continue."
                : undefined
            }
            onClick={handleBan}
          />
        </div>
      </Modal>
      <section className="w-full min-w-0 max-w-full overflow-x-hidden rounded-xl border border-neutral-200 bg-neutral-100 p-4">
        <div className="flex items-center gap-2">
          <UserXmark className="size-4 text-neutral-500" />
          <h3 className="text-sm font-semibold text-neutral-900">
            Network ban
          </h3>
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          {isBanned
            ? "This partner is banned from the Dub Partner Network."
            : "Confirms fraud, alerts enrolled programs, disables payouts and blocks new program applications."}
        </p>
        <div className="mt-2">
          <Button
            variant={isBanned ? "secondary" : "danger"}
            text={isBanned ? "Unban" : "Ban from network"}
            className="h-8 w-fit"
            onClick={() =>
              isBanned ? setShowUnbanModal(true) : setShowBanModal(true)
            }
          />
        </div>
      </section>
    </>
  );
}
