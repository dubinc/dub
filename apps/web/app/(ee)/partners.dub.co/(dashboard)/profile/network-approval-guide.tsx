import { submitNetworkProfileAction } from "@/lib/actions/partners/submit-network-profile";
import { getNetworkProfileChecklistProgress } from "@/lib/network/get-network-profile-checklist-progress";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import {
  Button,
  CircleCheck,
  CircleCheckFill,
  CircleDotted,
  CircleHalfDottedClock,
  CircleXmark,
  ExpandingArrow,
  ProgressCircle,
  StatusBadge,
} from "@dub/ui";
import { cn, isClickOnInteractiveChild } from "@dub/utils";
import { motion } from "motion/react";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { HTMLProps, useState } from "react";
import { toast } from "sonner";

const NETWORK_STATUS_BADGE_VARIANT = {
  submitted: {
    variant: "pending",
    label: "Pending approval",
    icon: CircleHalfDottedClock,
  },
  rejected: {
    variant: "error",
    label: "Rejected",
    icon: CircleXmark,
  },
  approved: {
    variant: "success",
    label: "Approved",
    icon: CircleCheck,
  },
} as const;

export function NetworkApprovalGuide() {
  const { partner, mutate } = usePartnerProfile();

  const { tasks, completedCount, totalCount, isComplete } =
    getNetworkProfileChecklistProgress({
      partner,
    });

  const [isExpanded, setIsExpanded] = useState(isComplete ? false : true);

  const { executeAsync: submitNetworkProfile } = useAction(
    submitNetworkProfileAction,
    {
      onSuccess: () => {
        toast.success("Application submitted successfully");
      },
      onError: ({ error }) => {
        toast.error(error.serverError);
      },
    },
  );

  const { setShowConfirmModal, confirmModal } = useConfirmModal({
    title: "Submit application",
    description:
      "Are you sure you want to submit your Dub Network application for review? You won't be able to make changes to your application after submitting it.",
    confirmText: "Confirm submission",
    onConfirm: async () => {
      await submitNetworkProfile();
      await mutate();
    },
  });

  if (!partner) return null;

  return (
    <>
      {confirmModal}
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="overflow-hidden"
      >
        <div
          className="text-content-inverted cursor-pointer rounded-2xl bg-neutral-900 p-2"
          onClick={(e) => {
            if (isClickOnInteractiveChild(e)) return;
            setIsExpanded((e) => !e);
          }}
        >
          <div className="flex flex-col items-center justify-between gap-3 px-3 py-2 md:flex-row">
            <div>
              <div className="flex flex-col-reverse gap-1.5 md:flex-row md:items-center">
                <h2 className="text-lg font-semibold">
                  Join the Dub Partner Network
                </h2>

                {partner.networkStatus === "draft" || !isComplete ? (
                  <div className="bg-bg-default/10 flex w-fit items-center gap-1.5 rounded-md px-2 py-1">
                    <ProgressCircle
                      progress={completedCount / totalCount}
                      className="text-green-500 [--track-color:#fff3]"
                    />
                    <span className="text-xs font-medium">
                      {completedCount} of {totalCount} tasks completed
                    </span>
                  </div>
                ) : (
                  (() => {
                    if (partner.networkStatus === "trusted") {
                      partner.networkStatus = "approved";
                    }
                    const {
                      variant,
                      label,
                      icon: Icon,
                    } = NETWORK_STATUS_BADGE_VARIANT[partner.networkStatus];
                    return (
                      <StatusBadge
                        className="dark"
                        icon={Icon}
                        variant={variant}
                      >
                        {label}
                      </StatusBadge>
                    );
                  })()
                )}
              </div>
              <p className="text-content-inverted/60 text-sm">
                Complete the steps to join the Dub Partner Network and start
                applying to programs in our network.
              </p>
            </div>
            {partner.networkStatus === "draft" && (
              <Button
                text="Submit application"
                onClick={() => setShowConfirmModal(true)}
                disabledTooltip={
                  !isComplete
                    ? "Complete all tasks to submit application"
                    : undefined
                }
                variant="secondary"
                className="h-9 w-full md:w-fit"
              />
            )}
          </div>

          <motion.div
            initial={false}
            animate={{
              height: isExpanded ? "auto" : 0,
              opacity: isExpanded ? 1 : 0,
              marginTop: isExpanded ? 8 : 0,
            }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div
              className="grid grid-cols-1 rounded-lg bg-neutral-800 p-2 sm:grid-cols-2"
              onClick={(e) => e.stopPropagation()}
            >
              {tasks.map(({ label, completed, href }) => (
                <ConditionalLink
                  key={label}
                  href={completed ? undefined : href}
                  className={cn(
                    "group flex items-center justify-between gap-2 rounded-md px-3 py-2",
                    !completed &&
                      href &&
                      "transition-colors duration-100 ease-out hover:bg-neutral-700",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {completed ? (
                      <CircleCheckFill className="size-4 shrink-0 text-green-500" />
                    ) : (
                      <CircleDotted className="size-4 shrink-0 text-neutral-400" />
                    )}
                    <span className="min-w-0 truncate text-sm">{label}</span>
                  </div>
                  {!completed && href && (
                    <div className="shrink-0 pr-4">
                      <ExpandingArrow className="group-hover:text-content-inverted text-neutral-500" />
                    </div>
                  )}
                </ConditionalLink>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </>
  );
}

function ConditionalLink({
  href,
  className,
  children,
  ...rest
}: Partial<HTMLProps<HTMLAnchorElement>>) {
  return href ? (
    <Link href={href} className={className} {...rest}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  );
}
