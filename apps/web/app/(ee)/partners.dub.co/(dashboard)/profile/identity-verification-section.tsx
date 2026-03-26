"use client";

import { parseActionError } from "@/lib/actions/parse-action-errors";
import { startIdentityVerificationAction } from "@/lib/actions/partners/start-identity-verification";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { PartnerProps } from "@/lib/types";
import { Button } from "@dub/ui";
import { ShieldCheck, TriangleWarning, Veriff } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useCallback, useState } from "react";
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
    },
  );

  const handleStartVerification = useCallback(async () => {
    if (!legalName.trim()) {
      toast.error("Please enter your legal name.");
      return;
    }

    const result = await executeAsync({ legalName: legalName.trim() });

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
  }, [executeAsync, mutate, legalName]);

  if (!partner) {
    return null;
  }

  const status = partner.identityVerificationStatus;

  const bannerMessage = (() => {
    if (status === "declined") {
      return `Verification failed: ${partner.identityVerificationDeclineReason || "Could not validate identity"}`;
    }

    if (status === "resubmissionRequested") {
      return "Verification failed: Unable to complete, please resubmit";
    }

    if (status === "expired") {
      return "Verification expired: Please start a new verification";
    }

    return null;
  })();

  const buttonText = (() => {
    if (!status || status === "expired" || status === "abandoned")
      return "Start verification";
    if (status === "started") return "Complete verification";
    if (status === "declined" || status === "resubmissionRequested")
      return "Resubmit verification";
    return null;
  })();

  const isPendingReview = status === "submitted" || status === "review";

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

      {bannerMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <TriangleWarning className="size-4 shrink-0 text-amber-600" />
          <p className="text-sm font-medium text-amber-900">{bannerMessage}</p>
        </div>
      )}

      <div className="border-border-subtle relative overflow-hidden rounded-lg border bg-neutral-50">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.4] [-webkit-mask-image:radial-gradient(ellipse_95%_85%_at_50%_42%,#000_0%,transparent_68%)] [background-image:radial-gradient(rgb(163_163_163)_1px,transparent_1px)] [background-size:4px_4px] [mask-image:radial-gradient(ellipse_95%_85%_at_50%_42%,#000_0%,transparent_68%)]"
          aria-hidden
        />
        <div className="relative flex flex-col items-center gap-3 px-6 py-6">
          <ShieldCheck
            className={cn(
              "size-8",
              status === "approved" ? "text-green-600" : "text-neutral-400",
            )}
          />

          {status === "approved" ? (
            <span className="text-sm font-medium text-green-600">
              Identity verified
            </span>
          ) : isPendingReview ? (
            <span className="text-sm font-medium text-amber-500">
              Pending review
            </span>
          ) : buttonText ? (
            <Button
              text={buttonText}
              variant="secondary"
              onClick={handleStartVerification}
              loading={isPending}
              className="h-10 w-fit rounded-lg px-4 py-1.5"
            />
          ) : null}

          <div className="flex items-center gap-1 text-xs font-medium text-neutral-400">
            <span>Powered by</span>
            <Veriff className="h-3 w-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
