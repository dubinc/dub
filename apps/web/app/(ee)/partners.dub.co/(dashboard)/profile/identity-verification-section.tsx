"use client";

import { parseActionError } from "@/lib/actions/parse-action-errors";
import { startIdentityVerificationAction } from "@/lib/actions/partners/start-identity-verification";
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
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";

export function IdentityVerificationSection({
  partner,
}: {
  partner?: PartnerProps;
}) {
  const { mutate } = usePartnerProfile();
  const [legalName, setLegalName] = useState(
    partner?.legalName ?? partner?.name ?? "",
  );

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
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-neutral-800">Legal name</span>
        <input
          type="text"
          value={legalName}
          onChange={(e) => setLegalName(e.target.value)}
          className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
          placeholder={partner.name}
        />
        <span className="text-xs text-neutral-500">
          Only used to verify your identity
        </span>
      </label>

      <div
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
            ) : (
              <ShieldCheck className="size-6 text-neutral-400" />
            )}

            {identityVerificationStatus === "approved" ? (
              <StatusBadge
                variant="success"
                className="rounded-lg font-semibold"
                icon={null}
              >
                Identity verified
              </StatusBadge>
            ) : isPendingReview ? (
              <StatusBadge
                variant="pending"
                className="rounded-lg font-semibold"
                icon={null}
              >
                Pending review
              </StatusBadge>
            ) : buttonText ? (
              <Button
                text={buttonText}
                variant="secondary"
                disabled={isMaxAttemptsReached}
                disabledTooltip={
                  isMaxAttemptsReached
                    ? "You have reached the maximum number of verification attempts. Please contact support if you need help."
                    : undefined
                }
                onClick={(e) =>
                  executeAsync({
                    legalName: legalName.trim(),
                  })
                }
                loading={isPending}
                className="h-10 w-fit rounded-lg px-4 py-1.5"
              />
            ) : null}

            <div className="flex items-center gap-1 text-xs font-medium text-neutral-400">
              <span>Powered by</span>
              <Veriff className="w-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
