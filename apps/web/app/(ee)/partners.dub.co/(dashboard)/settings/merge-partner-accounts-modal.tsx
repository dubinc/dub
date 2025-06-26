"use client";

import { mergePartnerAccountsAction } from "@/lib/actions/partners/merge-partner-accounts";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { Button, Modal } from "@dub/ui";
import { cn } from "@dub/utils";
import { OTPInput } from "input-otp";
import { useAction } from "next-safe-action/hooks";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

interface MergePartnerAccountsModalProps {
  showMergePartnerAccountsModal: boolean;
  setShowMergePartnerAccountsModal: Dispatch<SetStateAction<boolean>>;
}

interface EmailAccounts {
  sourceEmail: string;
  targetEmail: string;
}

function MergePartnerAccountsModal(props: MergePartnerAccountsModalProps) {
  const { showMergePartnerAccountsModal, setShowMergePartnerAccountsModal } =
    props;

  return (
    <Modal
      showModal={showMergePartnerAccountsModal}
      setShowModal={setShowMergePartnerAccountsModal}
    >
      <MergePartnerAccountsModalInner {...props} />
    </Modal>
  );
}

function MergePartnerAccountsModalInner({
  setShowMergePartnerAccountsModal,
}: MergePartnerAccountsModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(2);
  const [sourceEmail, setSourceEmail] = useState<string>("");
  const [targetEmail, setTargetEmail] = useState<string>("");

  return (
    <div>
      <div className="border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">Merge accounts</h3>
      </div>

      <div className="flex flex-col gap-2 bg-neutral-50 p-4 sm:p-6">
        {step === 1 && (
          <SendVerificationCode
            onSuccess={({ sourceEmail, targetEmail }) => {
              setSourceEmail(sourceEmail);
              setTargetEmail(targetEmail);
              setStep(2);
            }}
          />
        )}

        {step === 2 && <VerifyCode onSuccess={() => setStep(3)} />}

        {step === 3 && <MergeAccounts />}
      </div>
    </div>
  );
}

// Step 1: Send verification code to both accounts
function SendVerificationCode({
  onSuccess,
}: {
  onSuccess: (data: EmailAccounts) => void;
}) {
  const { partner } = usePartnerProfile();

  const {
    watch,
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      sourceEmail: partner?.email || "",
      targetEmail: "",
    },
  });

  const [sourceEmail, targetEmail] = watch(["sourceEmail", "targetEmail"]);

  const { executeAsync, isPending } = useAction(mergePartnerAccountsAction, {
    onSuccess: async () => {
      onSuccess({
        sourceEmail,
        targetEmail,
      });

      toast.success(
        "Verification codes sent successfully! Please check your email accounts.",
      );
    },
    onError({ error }) {
      toast.error(error.serverError);
    },
  });

  const onSubmit = async () => {
    await executeAsync({
      step: "send-tokens",
      sourceEmail,
      targetEmail,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <p className="text-sm font-medium text-neutral-700">
        Enter the email of the account you'd like to merge. We'll send a
        verification code to both emails.
      </p>

      <div className="flex flex-col gap-6">
        <div className="rounded-xl border border-solid border-neutral-200 bg-neutral-100 p-1 pt-0">
          <h3 className="px-1.5 py-2 text-xs font-medium leading-4 text-neutral-500">
            Source account
          </h3>
          <div className="rounded-lg border border-solid border-neutral-200 bg-white p-3">
            <label className="text-sm font-medium leading-5 text-neutral-900">
              Email
            </label>
            <div className="relative mt-2 rounded-md shadow-sm">
              <input
                type="email"
                required
                autoFocus
                placeholder="Enter source account email"
                className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                {...register("sourceEmail")}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-solid border-neutral-200 bg-neutral-100 p-1 pt-0">
          <h3 className="px-1.5 py-2 text-xs font-medium leading-4 text-neutral-500">
            Target account
          </h3>
          <div className="rounded-lg border border-solid border-neutral-200 bg-white p-3">
            <label className="text-sm font-medium leading-5 text-neutral-900">
              Email
            </label>
            <div className="relative mt-2 rounded-md shadow-sm">
              <input
                type="email"
                required
                autoFocus
                placeholder="Enter target account email"
                className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                {...register("targetEmail")}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="secondary"
          text="Cancel"
          className="h-8 w-fit px-3"
          disabled={isPending || isSubmitting}
        />
        <Button
          text="Send codes"
          className="h-8 w-fit px-3"
          type="submit"
          disabled={!sourceEmail || !targetEmail}
          loading={isPending || isSubmitting}
        />
      </div>
    </form>
  );
}

// Step 2: Verify code
function VerifyCode({ onSuccess }: { onSuccess: () => void }) {
  const { partner } = usePartnerProfile();

  const {
    watch,
    register,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      sourceCode: "",
      targetCode: "",
    },
  });

  const [sourceCode, targetCode] = watch(["sourceCode", "targetCode"]);

  const { executeAsync, isPending } = useAction(mergePartnerAccountsAction, {
    onSuccess: async () => {
      onSuccess();
    },
    onError({ error }) {
      toast.error(error.serverError);
    },
  });

  const onSubmit = async () => {
    await executeAsync({
      step: "verify-tokens",
      sourceEmail: "", // TODO: get from context
      targetEmail: "", // TODO: get from context
      sourceCode,
      targetCode,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <p className="text-sm font-medium text-neutral-700">
        We sent a 6-digit code to both emails. Didn’t receive them? Resend
        codes.
      </p>

      <div className="flex flex-col gap-6">
        <div className="rounded-xl border border-solid border-neutral-200 bg-neutral-100 p-1 pt-0">
          <h3 className="px-1.5 py-2 text-xs font-medium leading-4 text-neutral-500">
            Source account
          </h3>

          <div className="flex flex-col gap-4 rounded-lg border border-solid border-neutral-200 bg-white p-3">
            <div>
              <label className="text-sm font-medium leading-5 text-neutral-900">
                Email
              </label>
              <div className="relative mt-2 rounded-md shadow-sm">
                <input
                  disabled
                  className="block w-full rounded-md border-neutral-300 text-neutral-900 disabled:bg-neutral-100 sm:text-sm"
                  defaultValue=""
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium leading-5 text-neutral-900">
                Verification code
              </label>
              <div className="relative mt-2">
                <OTPInput
                  maxLength={6}
                  value={sourceCode}
                  onChange={(code) => {
                    setValue("sourceCode", code);
                  }}
                  render={({ slots }) => (
                    <div className="flex w-full items-center justify-between">
                      {slots.map(({ char, isActive, hasFakeCaret }, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "relative flex h-14 w-12 items-center justify-center text-xl",
                            "rounded-lg border border-neutral-200 bg-white ring-0 transition-all",
                            isActive &&
                              "z-10 border border-neutral-800 ring-2 ring-neutral-200",
                            // isInvalidCode && "border-red-500 ring-red-200",
                          )}
                        >
                          {char}
                          {hasFakeCaret && (
                            <div className="animate-caret-blink pointer-events-none absolute inset-0 flex items-center justify-center">
                              <div className="h-5 w-px bg-black" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-solid border-neutral-200 bg-neutral-100 p-1 pt-0">
          <h3 className="px-1.5 py-2 text-xs font-medium leading-4 text-neutral-500">
            Target account
          </h3>

          <div className="flex flex-col gap-4 rounded-lg border border-solid border-neutral-200 bg-white p-3">
            <div>
              <label className="text-sm font-medium leading-5 text-neutral-900">
                Email
              </label>
              <div className="relative mt-2 rounded-md shadow-sm">
                <input
                  disabled
                  className="block w-full rounded-md border-neutral-300 text-neutral-900 disabled:bg-neutral-100 sm:text-sm"
                  defaultValue="kiran@dub.co"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium leading-5 text-neutral-900">
                Verification code
              </label>
              <div className="relative mt-2">
                <OTPInput
                  maxLength={6}
                  value={targetCode}
                  onChange={(code) => {
                    setValue("targetCode", code);
                  }}
                  render={({ slots }) => (
                    <div className="flex w-full items-center justify-between">
                      {slots.map(({ char, isActive, hasFakeCaret }, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "relative flex h-14 w-12 items-center justify-center text-xl",
                            "rounded-lg border border-neutral-200 bg-white ring-0 transition-all",
                            isActive &&
                              "z-10 border border-neutral-800 ring-2 ring-neutral-200",
                            // isInvalidCode && "border-red-500 ring-red-200",
                          )}
                        >
                          {char}
                          {hasFakeCaret && (
                            <div className="animate-caret-blink pointer-events-none absolute inset-0 flex items-center justify-center">
                              <div className="h-5 w-px bg-black" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="secondary"
          text="Cancel"
          className="h-8 w-fit px-3"
          disabled={isPending || isSubmitting}
        />
        <Button
          text="Verify accounts"
          className="h-8 w-fit px-3"
          type="submit"
          disabled={!sourceCode || !targetCode}
          loading={isPending || isSubmitting}
        />
      </div>
    </form>
  );
}

// Step 3: Merge accounts
function MergeAccounts() {
  return <div>MergeAccounts</div>;
}

export function useMergePartnerAccountsModal() {
  const [showMergePartnerAccountsModal, setShowMergePartnerAccountsModal] =
    useState(false);

  const MergePartnerAccountsModalCallback = useCallback(() => {
    return (
      <MergePartnerAccountsModal
        showMergePartnerAccountsModal={showMergePartnerAccountsModal}
        setShowMergePartnerAccountsModal={setShowMergePartnerAccountsModal}
      />
    );
  }, [showMergePartnerAccountsModal, setShowMergePartnerAccountsModal]);

  return useMemo(
    () => ({
      setShowMergePartnerAccountsModal,
      MergePartnerAccountsModal: MergePartnerAccountsModalCallback,
    }),
    [setShowMergePartnerAccountsModal, MergePartnerAccountsModalCallback],
  );
}
