"use client";

import { Button } from "@dub/ui";
import { TextArea } from "@radix-ui/themes";
import { trackClientEvents } from "core/integration/analytic";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface";
import { useRouter } from "next/navigation";
import { FC, useState } from "react";
import { toast } from "sonner";
import {
  CANCEL_REASONS,
  PLACEHOLDER_BY_REASON,
} from "./constants/cancel-reasons.constants";
import { validateFeedback } from "./helplers/feedback-validation";

interface ICancellationFlowFeedbackModuleProps {
  pageName: string;
  sessionId: string;
  email: string;
}

export const CancellationFlowFeedbackModule: FC<
  Readonly<ICancellationFlowFeedbackModuleProps>
> = ({ pageName, sessionId, email }) => {
  const router = useRouter();

  const [selectedCancelReason, setSelectedCancelReason] = useState<string>("");
  const [cancelReason, setCancelReason] = useState<string>("");
  const [error, setError] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleReasonSelect = (value: string) => {
    setSelectedCancelReason(value);
    setCancelReason("");
    setError("");
  };

  const handleReasonTextChange = (value: string) => {
    setCancelReason(value);
    setError("");
  };

  const handleBlur = () => {
    if (cancelReason) {
      const validationError = validateFeedback(cancelReason);
      setError(validationError);
    }
  };

  const handleContinue = async () => {
    if (!selectedCancelReason) {
      toast.error("Please select a cancellation reason");
      return;
    }

    const validationError = validateFeedback(cancelReason);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    trackClientEvents({
      event: EAnalyticEvents.USER_FEEDBACK,
      params: {
        page_name: pageName,
        flow_type: "cancel_subscription",
        trigger: "cancellation_portal",
        content_value: selectedCancelReason,
        custom_input: cancelReason,
        event_category: "Authorized",
        email,
      },
      sessionId,
    });

    router.push("/cancellation");
  };

  return (
    <div className="md:py-18 mx-auto mt-4 flex w-full max-w-[470px] flex-col items-center justify-center gap-6 px-4 py-8 md:mt-6">
      <h1 className="text-center text-2xl font-semibold lg:text-2xl">
        We are sorry to see you cancelling!
      </h1>
      <p className="text-default-700 text-center text-sm">
        Please help us improve by the reason.
      </p>

      <div className="flex w-full flex-col gap-2">
        <select
          className="block w-full rounded-md border-neutral-300 text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
          value={selectedCancelReason}
          onChange={(e) => handleReasonSelect(e.target.value)}
        >
          <option value="" disabled>
            Select a reason...
          </option>
          {CANCEL_REASONS.map((item, key) => (
            <option value={item.value} key={key}>
              {item.label}
            </option>
          ))}
        </select>

        <div className="flex w-full flex-col gap-1">
          <TextArea
            className="w-full"
            value={cancelReason}
            onChange={(e) => handleReasonTextChange(e.target.value)}
            onBlur={handleBlur}
            placeholder={
              selectedCancelReason &&
              PLACEHOLDER_BY_REASON[selectedCancelReason]
                ? PLACEHOLDER_BY_REASON[selectedCancelReason]
                : "Please select a reason first..."
            }
            disabled={!selectedCancelReason}
          />
          {error && (
            <span className="text-xs font-medium text-red-500 md:text-sm">
              {error}
            </span>
          )}
        </div>
      </div>

      <Button
        loading={isLoading}
        disabled={!selectedCancelReason || !cancelReason.trim()}
        onClick={handleContinue}
        text="Continue"
      />
    </div>
  );
};
