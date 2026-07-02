"use client";

import type { DiscountProps } from "@/lib/types";
import { ERROR_MAP } from "@/ui/partners/constants";
import { UpgradeRequiredToast } from "@/ui/shared/upgrade-required-toast";
import { toast } from "sonner";
import { copyDiscountToLiveAction } from "../copy-discount-to-live";
import { createCopyToLiveModalHook } from "./copy-to-live-modal";

const useCopyToLiveModal = createCopyToLiveModalHook<
  DiscountProps,
  {
    workspaceId: string;
    discountId: string;
    targetGroupId: string;
  }
>({
  title: "Copy discount to live group",
  getHint: () => "Select a group with no discount set up",
  successMessage: "Discount copied to live program!",
  serverAction: copyDiscountToLiveAction,
  buildInput: (targetGroupId, workspaceId, discount) => ({
    workspaceId,
    discountId: discount.id,
    targetGroupId,
  }),
  onError(error) {
    if (error.serverError) {
      const code = Object.keys(ERROR_MAP).find((key) =>
        error.serverError!.startsWith(key),
      );

      if (code) {
        const { title, ctaLabel, ctaUrl } = ERROR_MAP[code];
        const message = error.serverError!.replace(`${code}: `, "");

        toast.custom(() => (
          <UpgradeRequiredToast
            title={title}
            message={message}
            ctaLabel={ctaLabel}
            ctaUrl={ctaUrl}
          />
        ));
        return;
      }
    }

    toast.error(error.serverError ?? "Failed to copy discount to live.");
  },
});

export function useCopyDiscountToLiveModal() {
  const { openCopyToLiveModal, CopyToLiveModal } = useCopyToLiveModal();

  return {
    openCopyDiscountToLiveModal: openCopyToLiveModal,
    CopyDiscountToLiveModal: CopyToLiveModal,
  };
}
