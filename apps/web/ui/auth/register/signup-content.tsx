"use client";

import { AuthType, MessageType } from "@/ui/modals/auth-modal.tsx";
import { cn, truncate } from "@dub/utils";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect } from "react";
import { ERegistrationStep } from "./constants";
import { RegisterProvider, useRegisterContext } from "./context";
import { SignUpForm } from "./signup-form";
import { VerifyEmailForm } from "./verify-email-form";

type SignUpContentProps = {
  authModal?: boolean;
  setAuthModalMessage?: (message: string | null, type: MessageType) => void;
  onStepChange?: (step: ERegistrationStep) => void;
  switchAuthType?: (type: AuthType) => void;
};

function SignUpStep({ authModal = false }) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
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
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className={cn("bg-neutral-50 px-4 py-8 sm:px-16", {
          "px-0 py-0 sm:px-0": authModal,
        })}
      >
        <SignUpForm authModal={authModal} />
      </motion.div>
    </>
  );
}

function VerifyStep({ authModal = false, setAuthModalMessage }) {
  const { email } = useRegisterContext();

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
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
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className={cn("bg-neutral-50 px-4 py-8 sm:px-16", {
          "px-0 py-0 sm:px-0": authModal,
        })}
      >
        <VerifyEmailForm
          authModal={authModal}
          setAuthModalMessage={setAuthModalMessage}
        />
      </motion.div>
    </>
  );
}

function RegisterContent({
  authModal = false,
  setAuthModalMessage,
  onStepChange,
  switchAuthType,
}) {
  const { step } = useRegisterContext();

  useEffect(() => {
    if (onStepChange) {
      onStepChange(step);
    }
  }, [step, onStepChange]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
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
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className={cn("mt-4 text-center text-sm text-neutral-500", {
          "text-xs": authModal && step === ERegistrationStep.VERIFY,
        })}
      >
        Already have an account?&nbsp;
        {authModal ? (
          <button
            onClick={() => switchAuthType && switchAuthType("login")}
            className="hover:text-neutral font-semibold text-neutral-500 underline underline-offset-2 transition-colors"
          >
            Log in
          </button>
        ) : (
          <Link
            href="/login"
            className="hover:text-neutral font-semibold text-neutral-500 underline underline-offset-2 transition-colors"
          >
            Log in
          </Link>
        )}
      </motion.p>
    </>
  );
}

export function SignUpContent({
  authModal = false,
  setAuthModalMessage,
  onStepChange,
  switchAuthType,
}: SignUpContentProps) {
  return (
    <RegisterProvider>
      <RegisterContent
        authModal={authModal}
        setAuthModalMessage={setAuthModalMessage}
        onStepChange={onStepChange}
        switchAuthType={switchAuthType}
      />
    </RegisterProvider>
  );
}
