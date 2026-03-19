"use client";

import { parseActionError } from "@/lib/actions/parse-action-errors";
import { startIdentityVerificationAction } from "@/lib/actions/partners/start-identity-verification";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { PartnerProps } from "@/lib/types";
import { Button, StatusBadge } from "@dub/ui";
import { formatDate } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useCallback } from "react";
import { toast } from "sonner";

const STATUS_CONFIG = {
  pending: {
    badge: {
      label: "In progress",
      variant: "pending",
    },
    title: "Verification in progress",
    description:
      "Your identity verification is being processed. This usually takes a few minutes.",
    buttonText: "Continue verification",
    showButton: true,
  },
  approved: {
    badge: {
      label: "Verified",
      variant: "success",
    },
    title: "Identity verified",
    description: "Your identity has been verified.",
    buttonText: null,
    showButton: false,
  },
  declined: {
    badge: {
      label: "Declined",
      variant: "error",
    },
    title: "Verification declined",
    description:
      "Your identity verification was declined. Please try again with a valid government-issued ID.",
    buttonText: "Try again",
    showButton: true,
  },
  resubmissionRequested: {
    badge: {
      label: "Action needed",
      variant: "warning",
    },
    title: "Additional information needed",
    description:
      "We need additional information to verify your identity. Please resubmit your documents.",
    buttonText: "Resume verification",
    showButton: true,
  },
  expired: {
    badge: {
      label: "Expired",
      variant: "neutral",
    },
    title: "Verification expired",
    description:
      "Your verification session has expired. Please start a new verification.",
    buttonText: "Start new verification",
    showButton: true,
  },
} as const;

export function IdentityVerificationCard({
  partner,
}: {
  partner?: PartnerProps;
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
    },
  );

  const handleStartVerification = useCallback(async () => {
    const result = await executeAsync();

    if (!result?.data?.sessionUrl) {
      return;
    }

    const { createVeriffFrame, MESSAGES } = await import(
      "@veriff/incontext-sdk"
    );

    createVeriffFrame({
      url: result.data.sessionUrl,
      onEvent: (msg) => {
        if (msg === MESSAGES.FINISHED) {
          toast.success(
            "Verification submitted. We'll update your status shortly.",
          );
          mutate();
        }
      },
    });
  }, [executeAsync, mutate]);

  if (!partner) {
    return null;
  }

  const status = partner.identityVerificationStatus;
  const config = status ? STATUS_CONFIG[status] : null;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              Identity verification
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              {config
                ? config.description
                : "Verify your identity to build trust with programs and enable faster payout approvals."}
            </p>
          </div>
          {config && (
            <StatusBadge variant={config.badge.variant}>
              {config.badge.label}
            </StatusBadge>
          )}
        </div>

        {status === "approved" && partner.identityVerifiedAt && (
          <p className="text-sm text-neutral-500">
            Verified on {formatDate(partner.identityVerifiedAt)}
          </p>
        )}

        {(config?.showButton || !status) && (
          <div>
            <Button
              text={config?.buttonText || "Start verification"}
              variant="secondary"
              onClick={handleStartVerification}
              loading={isPending}
              className="h-9"
            />
          </div>
        )}
      </div>
    </div>
  );
}
