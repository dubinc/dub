"use client";

import { parseActionError } from "@/lib/actions/parse-action-errors";
import { startIdentityVerificationAction } from "@/lib/actions/partners/start-identity-verification";
import { hasPermission } from "@/lib/auth/partner-users/partner-user-permissions";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { PartnerProps } from "@/lib/types";
import { MAX_PARTNER_IDENTITY_VERIFICATION_ATTEMPTS } from "@/lib/zod/schemas/partners";
import { Button, StatusBadge } from "@dub/ui";
import {
  ShieldCheck,
  TriangleWarning,
  Veriff,
  VerifiedBadge,
} from "@dub/ui/icons";
import { cn, DUPLICATE_IDENTITY_DECLINE_REASON } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";

export function IdentityVerificationSection({
  partner,
  setShowMergePartnerAccountsModal,
}: {
  partner?: PartnerProps;
  setShowMergePartnerAccountsModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { mutate } = usePartnerProfile();

  const { executeAsync, isPending } = useAction(
    startIdentityVerificationAction,
    {
      onError: ({ error }) => {
        toast.error(
          parseActionError(error, "Failed to start identity verification."),
        );
      },
      onSuccess: async ({ data }) => {
        const { createVeriffFrame, MESSAGES } = await import(
          "@veriff/incontext-sdk"
        );

        createVeriffFrame({
          url: data.sessionUrl,
          onEvent: (msg) => {
            if (msg === MESSAGES.FINISHED) {
              toast.success(
                "Verification submitted. We'll update your status shortly.",
              );
              mutate();
            }
          },
        });

        mutate();
      },
    },
  );

  if (!partner) {
    return null;
  }

  const {
    identityVerificationStatus,
    identityVerificationDeclineReason,
    identityVerificationAttemptCount,
  } = partner;

  const cannotUpdateProfile = !hasPermission(
    partner.role,
    "partner_profile.update",
  );

  const isPendingReview =
    identityVerificationStatus === "submitted" ||
    identityVerificationStatus === "review";

  const isMaxAttemptsReached =
    identityVerificationAttemptCount >=
      MAX_PARTNER_IDENTITY_VERIFICATION_ATTEMPTS &&
    identityVerificationStatus !== "approved" &&
    !isPendingReview;

  const isFailed = [
    "declined",
    "resubmissionRequested",
    "expired",
    "abandoned",
  ].includes(identityVerificationStatus || "");

  let buttonText = "Start verification";
  let failedReason = identityVerificationDeclineReason || null;

  // If the verification failed and no reason is provided, set the reason based on the status
  if (isFailed && failedReason === null) {
    switch (identityVerificationStatus) {
      case "declined":
        failedReason =
          "We couldn't verify your identity. Please check your information or documents and try again.";
        break;
      case "resubmissionRequested":
        failedReason =
          "Verification couldn't be completed. Please check your information and resubmit.";
        break;
      case "expired":
        failedReason =
          "Verification attempt expired. Please start a new verification";
        break;
      case "abandoned":
        failedReason =
          "Verification attempt abandoned. Please start a new verification";
        break;
    }
  }

  const IS_DUPLICATE_IDENTITY_DECLINE =
    identityVerificationStatus === "declined" &&
    failedReason === DUPLICATE_IDENTITY_DECLINE_REASON;

  switch (identityVerificationStatus) {
    case "started":
      buttonText = "Complete verification";
      break;
    case "declined":
    case "resubmissionRequested":
      buttonText = "Resubmit verification";
      break;
  }

  return (
    <div
      id="identity-verification"
      className={cn(
        failedReason && "overflow-hidden rounded-lg bg-amber-100 p-1",
      )}
    >
      {failedReason && (
        <div className="flex items-center gap-2 px-2 py-2">
          <TriangleWarning className="size-3.5 shrink-0 text-amber-500" />
          <p className="leading-0 text-sm font-medium text-amber-900">
            <span className="font-semibold">Verification failed:</span>{" "}
            {failedReason}
            {IS_DUPLICATE_IDENTITY_DECLINE && (
              <span>
                {" "}
                Please{" "}
                <button
                  onClick={() => setShowMergePartnerAccountsModal(true)}
                  className="font-semibold underline underline-offset-2"
                >
                  merge your accounts
                </button>{" "}
                or{" "}
                <a
                  href="https://dub.co/support"
                  className="font-semibold underline underline-offset-2"
                  target="_blank"
                >
                  contact support
                </a>{" "}
                if you believe this is a mistake.
              </span>
            )}
          </p>
        </div>
      )}

      <div className="border-border-subtle relative overflow-hidden rounded-lg border bg-neutral-50">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.4] [-webkit-mask-image:radial-gradient(ellipse_95%_85%_at_50%_42%,#000_0%,transparent_68%)] [background-image:radial-gradient(rgb(163_163_163)_1px,transparent_1px)] [background-size:4px_4px] [mask-image:radial-gradient(ellipse_95%_85%_at_50%_42%,#000_0%,transparent_68%)]"
          aria-hidden
        />
        <div className="relative flex flex-col items-center gap-3 px-6 py-3">
          {identityVerificationStatus === "approved" ? (
            <VerifiedBadge className="size-6" />
          ) : !IS_DUPLICATE_IDENTITY_DECLINE ? (
            <ShieldCheck className="size-6 text-neutral-400" />
          ) : null}

          {identityVerificationStatus === "approved" && (
            <StatusBadge
              variant="success"
              className="rounded-lg font-semibold"
              icon={null}
            >
              Identity verified
            </StatusBadge>
          )}

          {isPendingReview && (
            <StatusBadge
              variant="pending"
              className="rounded-lg font-semibold"
              icon={null}
            >
              Pending review
            </StatusBadge>
          )}

          {identityVerificationStatus !== "approved" &&
            !isPendingReview &&
            buttonText && (
              <Button
                text={
                  IS_DUPLICATE_IDENTITY_DECLINE ? "Merge accounts" : buttonText
                }
                variant="secondary"
                disabled={isMaxAttemptsReached || cannotUpdateProfile}
                disabledTooltip={
                  cannotUpdateProfile
                    ? "You don't have permission to update this field"
                    : isMaxAttemptsReached
                      ? "You have reached the maximum number of verification attempts. Please contact support if you need help."
                      : undefined
                }
                onClick={() => {
                  if (IS_DUPLICATE_IDENTITY_DECLINE) {
                    setShowMergePartnerAccountsModal(true);
                  } else {
                    executeAsync();
                  }
                }}
                loading={isPending}
                className="h-10 w-fit rounded-lg px-4 py-1.5"
              />
            )}

          {!IS_DUPLICATE_IDENTITY_DECLINE && (
            <div className="flex items-center gap-1 text-xs font-medium text-neutral-400">
              <span>Powered by</span>
              <Veriff className="w-auto pb-px" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
