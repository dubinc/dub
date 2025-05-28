"use client";

import { cn, truncate } from "@dub/utils";
import Link from "next/link";
import { useEffect } from "react";
import { MessageType } from "../../../app/app.dub.co/(auth)/auth.modal.tsx";
import { ERegistrationStep } from "./constants";
import { RegisterProvider, useRegisterContext } from "./context";
import { SignUpForm } from "./signup-form";
import { VerifyEmailForm } from "./verify-email-form";

type SignUpContentProps = {
  authModal?: boolean;
  setAuthModalMessage?: (message: string | null, type: MessageType) => void;
  onStepChange?: (step: ERegistrationStep) => void;
};

function SignUpStep({ authModal = false }) {
  return (
    <>
      <div
        className={cn(
          "border-border-500 border-b bg-white pb-6 pt-8 text-center",
          {
            "flex flex-col items-center justify-center border-none bg-neutral-50 pt-0":
              authModal,
          },
        )}
      >
        <h3 className="text-lg font-semibold">
          {authModal ? "One last step" : "Get started with GetQR"}
        </h3>
        {authModal && (
          <p className="max-w-[320px] text-base text-neutral-500">
            Create your free account to download your QR code instantly.
          </p>
        )}
      </div>
      <div
        className={cn("bg-neutral-50 px-4 py-8 sm:px-16", {
          "px-0 py-0 sm:px-0": authModal,
        })}
      >
        <SignUpForm authModal={authModal} />
      </div>
    </>
  );
}

function VerifyStep({ authModal = false, setAuthModalMessage }) {
  const { email } = useRegisterContext();

  return (
    <>
      <div
        className={cn(
          "border-border-500 flex flex-col items-center justify-center gap-3 border-b bg-white px-4 pb-6 pt-8 text-center sm:px-16",
          {
            "border-none bg-neutral-50 pt-0": authModal,
          },
        )}
      >
        <h3 className="text-xl font-semibold">Verify your email address</h3>
        <p className="text-sm text-neutral-500">
          Enter the six digit verification code sent to{" "}
          <strong className="font-medium text-neutral-600" title={email}>
            {truncate(email, 30)}
          </strong>
        </p>
      </div>
      <div
        className={cn("bg-neutral-50 px-4 py-8 sm:px-16", {
          "px-0 py-0 sm:px-0": authModal,
        })}
      >
        <VerifyEmailForm
          authModal={authModal}
          setAuthModalMessage={setAuthModalMessage}
        />
      </div>
    </>
  );
}

function RegisterContent({
  authModal = false,
  setAuthModalMessage,
  onStepChange,
}) {
  const { step } = useRegisterContext();

  useEffect(() => {
    if (onStepChange) {
      onStepChange(step);
    }
  }, [step, onStepChange]);

  return (
    <>
      <div
        className={cn("w-full max-w-md overflow-hidden", {
          "border-border-500 border-y sm:rounded-2xl sm:border sm:shadow-sm":
            !authModal,
        })}
      >
        {step === ERegistrationStep.SIGNUP ? (
          <SignUpStep authModal={authModal} />
        ) : (
          <VerifyStep
            authModal={authModal}
            setAuthModalMessage={setAuthModalMessage}
          />
        )}
      </div>
      <p
        className={cn("mt-4 text-center text-sm text-neutral-500", {
          "text-xs": authModal && step === ERegistrationStep.VERIFY,
        })}
      >
        Already have an account?&nbsp;
        <Link
          href="/login"
          className="hover:text-neutral font-semibold text-neutral-500 underline underline-offset-2 transition-colors"
        >
          Log in
        </Link>
      </p>
    </>
  );
}

export function SignUpContent({
  authModal = false,
  setAuthModalMessage,
  onStepChange,
}: SignUpContentProps) {
  return (
    <RegisterProvider>
      <RegisterContent
        authModal={authModal}
        setAuthModalMessage={setAuthModalMessage}
        onStepChange={onStepChange}
      />
    </RegisterProvider>
  );
}
