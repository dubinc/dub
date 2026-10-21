"use client";

import { AdminNetworkPartner } from "@/lib/types";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { Button } from "@dub/ui";
import { UserXmark } from "@dub/ui/icons";
import { useState } from "react";
import { toast } from "sonner";

export function NetworkBan({
  partner,
  onChange,
}: {
  partner: Pick<AdminNetworkPartner, "id" | "networkStatus">;
  onChange: () => Promise<void>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isBanned = partner.networkStatus === "banned";

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/admin/partners/${partner.id}/network-ban`,
        {
          method: isBanned ? "DELETE" : "POST",
        },
      );

      if (!response.ok) {
        throw new Error(
          (await response.text()) ||
            `Failed to ${isBanned ? "unban" : "ban"} partner.`,
        );
      }

      toast.success(
        isBanned
          ? "Partner unbanned from the Dub Partner Network."
          : "Partner banned from the Dub Partner Network.",
      );
      await onChange();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to ${isBanned ? "unban" : "ban"} partner.`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const { setShowConfirmModal, confirmModal } = useConfirmModal(
    isBanned
      ? {
          title: "Unban from network",
          description:
            "This will move the partner's network profile back to draft. Payouts are enabled again if a payout method is still active.",
          confirmText: "Unban",
          onConfirm: handleSubmit,
        }
      : {
          title: "Ban from network",
          description:
            "This will ban the partner from the Dub Partner Network, disable their payouts and block new program applications. Their program enrollments do not change.",
          confirmText: "Ban from network",
          confirmVariant: "danger",
          onConfirm: handleSubmit,
        },
  );

  return (
    <>
      {confirmModal}
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
            : "Disables payouts and blocks new program applications."}
        </p>
        <div className="mt-2">
          <Button
            variant={isBanned ? "secondary" : "danger"}
            text={isBanned ? "Unban" : "Ban from network"}
            loading={isSubmitting}
            className="h-8 w-fit"
            onClick={() => setShowConfirmModal(true)}
          />
        </div>
      </section>
    </>
  );
}
