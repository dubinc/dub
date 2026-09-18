"use client";

import {
  STRIPE_CANCELLATION_COMMENT_MAX_LENGTH,
  STRIPE_CANCELLATION_FEEDBACK,
  STRIPE_CANCELLATION_FEEDBACK_LABELS,
  type StripeCancellationFeedback,
} from "@/lib/stripe/cancellation-feedback";
import { Button, Modal } from "@dub/ui";
import { cn } from "@dub/utils";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

function CancelSubscriptionModal({
  showCancelSubscriptionModal,
  setShowCancelSubscriptionModal,
  billingCycleEndsAt,
  onConfirm,
}: {
  showCancelSubscriptionModal: boolean;
  setShowCancelSubscriptionModal: Dispatch<SetStateAction<boolean>>;
  billingCycleEndsAt?: Date | string | null;
  onConfirm: (data: {
    feedback: StripeCancellationFeedback;
    comment: string;
  }) => Promise<void>;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<StripeCancellationFeedback | "">(
    "",
  );
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!showCancelSubscriptionModal) {
      setFeedback("");
      setComment("");
      setIsLoading(false);
    }
  }, [showCancelSubscriptionModal]);

  const canSubmit = Boolean(feedback) && comment.trim().length > 0;

  const handleConfirm = async () => {
    if (isLoading || !feedback || !comment.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      await onConfirm({
        feedback,
        comment: comment.trim(),
      });
      setShowCancelSubscriptionModal(false);
    } catch {
      // Error toast is handled by the caller
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      showModal={showCancelSubscriptionModal}
      setShowModal={setShowCancelSubscriptionModal}
      className="max-w-md"
    >
      <div className="divide-y divide-neutral-200">
        <div className="p-4 sm:px-6">
          <h3 className="text-content-emphasis text-lg font-medium">
            Cancel subscription
          </h3>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleConfirm();
          }}
        >
          <div className="flex flex-col gap-4 px-4 py-6 sm:px-6">
            <p className="text-sm text-neutral-600">
              Your subscription will be scheduled for cancellation at the end of
              your current billing period
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
              ) : null}
              . You will keep access until then.
            </p>

            <div>
              <label
                htmlFor="cancellation-feedback"
                className="block text-sm font-medium text-neutral-900"
              >
                Reason for canceling
              </label>
              <div className="relative mt-1.5 rounded-md shadow-sm">
                <select
                  id="cancellation-feedback"
                  name="feedback"
                  required
                  value={feedback}
                  disabled={isLoading}
                  onChange={(e) =>
                    setFeedback(e.target.value as StripeCancellationFeedback)
                  }
                  className="block w-full rounded-md border-neutral-300 text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                >
                  <option value="" disabled>
                    Select a reason
                  </option>
                  {STRIPE_CANCELLATION_FEEDBACK.map((value) => (
                    <option value={value} key={value}>
                      {STRIPE_CANCELLATION_FEEDBACK_LABELS[value]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="cancellation-comment"
                  className="block text-sm font-medium text-neutral-900"
                >
                  Additional details
                </label>
                <span className="text-xs tabular-nums text-neutral-400">
                  {comment.length}/{STRIPE_CANCELLATION_COMMENT_MAX_LENGTH}
                </span>
              </div>
              <textarea
                id="cancellation-comment"
                name="comment"
                required
                rows={4}
                maxLength={STRIPE_CANCELLATION_COMMENT_MAX_LENGTH}
                placeholder="Tell us more about why you're canceling..."
                value={comment}
                disabled={isLoading}
                onChange={(e) => setComment(e.target.value)}
                className={cn(
                  "mt-1.5 block w-full resize-y rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400",
                  "focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                )}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-4 py-4 sm:px-6">
            <Button
              type="button"
              variant="secondary"
              className="h-8 w-fit"
              text="Not now"
              disabled={isLoading}
              onClick={() => setShowCancelSubscriptionModal(false)}
            />
            <Button
              type="submit"
              variant="primary"
              className="h-8 w-fit"
              text="Cancel subscription"
              loading={isLoading}
              disabled={!canSubmit}
            />
          </div>
        </form>
      </div>
    </Modal>
  );
}

export function useCancelSubscriptionModal({
  billingCycleEndsAt,
  onConfirm,
}: {
  billingCycleEndsAt?: Date | string | null;
  onConfirm: (data: {
    feedback: StripeCancellationFeedback;
    comment: string;
  }) => Promise<void>;
}) {
  const [showCancelSubscriptionModal, setShowCancelSubscriptionModal] =
    useState(false);

  const onConfirmRef = useRef(onConfirm);
  onConfirmRef.current = onConfirm;

  const billingCycleEndsAtRef = useRef(billingCycleEndsAt);
  billingCycleEndsAtRef.current = billingCycleEndsAt;

  const CancelSubscriptionModalCallback = useCallback(() => {
    return (
      <CancelSubscriptionModal
        showCancelSubscriptionModal={showCancelSubscriptionModal}
        setShowCancelSubscriptionModal={setShowCancelSubscriptionModal}
        billingCycleEndsAt={billingCycleEndsAtRef.current}
        onConfirm={(data) => onConfirmRef.current(data)}
      />
    );
  }, [showCancelSubscriptionModal]);

  return useMemo(
    () => ({
      setShowCancelSubscriptionModal,
      CancelSubscriptionModal: CancelSubscriptionModalCallback,
    }),
    [setShowCancelSubscriptionModal, CancelSubscriptionModalCallback],
  );
}
