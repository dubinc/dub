"use client";

import { clientAccessCheck } from "@/lib/client-access-check";
import { wouldLosePartnerAccess } from "@/lib/plans/has-partner-access";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  Button,
  DynamicTooltipWrapper,
  Icon,
  Popover,
  SquareXmark,
  StripeIcon,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useConfirmModal } from "../modals/confirm-modal";
import { usePlanChangeConfirmationModal } from "../modals/plan-change-confirmation-modal";
import { ThreeDots } from "../shared/icons";

export default function SubscriptionMenu() {
  const {
    id: workspaceId,
    role,
    plan,
    defaultProgramId,
    billingCycleEndsAt,
    subscriptionCanceledAt,
    mutate,
  } = useWorkspace();
  const router = useRouter();

  const permissionsError = clientAccessCheck({
    action: "billing.write",
    role,
  }).error;

  const [isOpen, setIsOpen] = useState(false);
  const [clicked, setClicked] = useState(false);

  const openBillingPortal = () => {
    setIsOpen(false);
    setClicked(true);
    return fetch(`/api/workspaces/${workspaceId}/billing/manage`, {
      method: "POST",
    }).then(async (res) => {
      if (res.ok) {
        const url = await res.json();
        router.push(url);
      } else {
        const { error } = await res.json();
        toast.error(error.message);
        setClicked(false);
      }
    });
  };

  const cancelSubscription = () => {
    setIsOpen(false);
    setClicked(true);
    return fetch(`/api/workspaces/${workspaceId}/billing/cancel`, {
      method: "POST",
    }).then(async (res) => {
      if (res.ok) {
        // sleep for 2 seconds to make sure Stripe webhook was received, and then mutate
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await mutate();
        setClicked(false);
        toast.success(
          "Your subscription has been scheduled for cancellation at the end of the current period.",
        );
      } else {
        const { error } = await res.json();
        toast.error(error.message);
        setClicked(false);
      }
    });
  };

  // Check if canceling would lose partner access
  const losesPartnerAccess =
    plan &&
    defaultProgramId &&
    wouldLosePartnerAccess({ currentPlan: plan, newPlan: null });

  const { setShowPlanChangeConfirmationModal, PlanChangeConfirmationModal } =
    usePlanChangeConfirmationModal({
      onConfirm: async () => {
        await cancelSubscription();
        setShowPlanChangeConfirmationModal(false);
      },
    });
  const { setShowConfirmModal, confirmModal } = useConfirmModal({
    title: "Cancel subscription",
    description: (
      <p>
        Your subscription will be scheduled for cancellation at the end of your
        current billing period
        {billingCycleEndsAt ? (
          <span className="font-medium text-neutral-900">
            {" "}
            (
            {new Date(billingCycleEndsAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
            )
          </span>
        ) : (
          ""
        )}
        . You will keep access until then.
      </p>
    ),
    cancelText: "Not now",
    confirmText: "Cancel subscription",
    onConfirm: async () => {
      await cancelSubscription();
    },
  });

  const handleCancelSubscription = () => {
    setIsOpen(false);
    if (losesPartnerAccess) {
      setShowPlanChangeConfirmationModal(true);
    } else {
      setShowConfirmModal(true);
    }
  };

  if (plan === "enterprise") {
    return null;
  }

  return (
    <>
      <PlanChangeConfirmationModal />
      {confirmModal}
      <Popover
        openPopover={isOpen}
        setOpenPopover={setIsOpen}
        content={
          <Command tabIndex={0} loop className="pointer-events-auto">
            <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm focus-visible:outline-none sm:w-auto sm:min-w-[180px]">
              <MenuItem
                icon={StripeIcon}
                label="Open billing portal"
                onSelect={() => openBillingPortal()}
                disabledTooltip={permissionsError}
              />
              <MenuItem
                icon={SquareXmark}
                label="Cancel subscription"
                onSelect={handleCancelSubscription}
                disabledTooltip={
                  subscriptionCanceledAt
                    ? "Your subscription has already been scheduled for cancellation."
                    : permissionsError
                }
              />
            </Command.List>
          </Command>
        }
        align="end"
      >
        <Button
          type="button"
          className="h-9 px-2"
          variant="secondary"
          icon={<ThreeDots className="size-4 shrink-0" />}
          loading={clicked}
        />
      </Popover>
    </>
  );
}

function MenuItem({
  icon: IconComp,
  label,
  onSelect,
  disabledTooltip,
}: {
  icon: Icon;
  label: string;
  onSelect: () => void;
  disabledTooltip?: string | boolean;
}) {
  return (
    <DynamicTooltipWrapper
      tooltipProps={disabledTooltip ? { content: disabledTooltip } : undefined}
    >
      <Command.Item
        className={cn(
          "flex cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-md p-2 text-sm text-neutral-600",
          "data-[selected=true]:bg-neutral-100",
          disabledTooltip && "cursor-not-allowed opacity-50",
        )}
        onSelect={disabledTooltip ? undefined : onSelect}
      >
        <IconComp className="size-4 shrink-0 text-neutral-700" />
        {label}
      </Command.Item>
    </DynamicTooltipWrapper>
  );
}
