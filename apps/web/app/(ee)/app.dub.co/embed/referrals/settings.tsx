"use client";

import { AlertCircleFill } from "@/ui/shared/icons";
import {
  AnimatedSizeContainer,
  Button,
  TAB_ITEM_ANIMATION_SETTINGS,
  useMediaQuery,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { OTPInput } from "input-otp";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { createContext, useContext, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useEmbedToken } from "../use-embed-token";

// TODO:
// Don't display toast

type TremendousPayoutStep = "email" | "verify";

type TremendousPayoutSettingsContextValue = {
  email: string;
  setEmail: (email: string) => void;

  step: TremendousPayoutStep;
  setStep: (step: TremendousPayoutStep) => void;

  code: string;
  setCode: (code: string) => void;

  errorMessage: string | null;
  setErrorMessage: (message: string | null) => void;
};

const TremendousPayoutSettingsContext =
  createContext<TremendousPayoutSettingsContextValue | null>(null);

function usePayoutSettings() {
  const context = useContext(TremendousPayoutSettingsContext);

  if (!context) {
    throw new Error(
      "useTremendousPayoutSettings must be used within TremendousPayoutSettingsProvider",
    );
  }

  return context;
}

function TremendousPayoutSettingsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<TremendousPayoutStep>("email");
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <TremendousPayoutSettingsContext.Provider
      value={{
        email,
        setEmail,
        step,
        setStep,
        code,
        setCode,
        errorMessage,
        setErrorMessage,
      }}
    >
      {children}
    </TremendousPayoutSettingsContext.Provider>
  );
}

export function ReferralsEmbedSettings() {
  return (
    <TremendousPayoutSettingsProvider>
      <ReferralsEmbedSettingsContent />
    </TremendousPayoutSettingsProvider>
  );
}

function ReferralsEmbedSettingsContent() {
  const { step, errorMessage } = usePayoutSettings();

  return (
    <>
      <AnimatedSizeContainer height>
        {errorMessage && <ErrorAlert message={errorMessage} />}
      </AnimatedSizeContainer>

      <motion.div
        className="border-border-muted bg-bg-default rounded-lg border p-6 sm:p-8"
        {...TAB_ITEM_ANIMATION_SETTINGS}
      >
        <h3 className="text-content-emphasis text-lg font-semibold">
          Connect payouts
        </h3>
        <p className="text-content-subtle mt-2 text-sm">
          Enter the email address where you want to receive gift card payouts
          via Tremendous. We&apos;ll send a verification code to confirm
          ownership.
        </p>

        {step === "email" ? (
          <TremendousPayoutEmailStep />
        ) : (
          <TremendousPayoutVerifyStep />
        )}
      </motion.div>
    </>
  );
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="border-border-error bg-bg-error/40 text-content-error mb-4 flex items-start gap-2 rounded-lg border px-3 py-2.5"
    >
      <AlertCircleFill className="mt-0.5 size-4 shrink-0" />
      <p className="text-sm font-medium leading-5">{message}</p>
    </div>
  );
}

function TremendousPayoutEmailStep() {
  const token = useEmbedToken();

  const { email, setEmail, setStep, setCode, setErrorMessage } =
    usePayoutSettings();

  const [isSendingOtp, setIsSendingOtp] = useState(false);

  const sendOtp = async () => {
    if (!email) {
      setErrorMessage("Please enter an email address.");
      return;
    }

    setIsSendingOtp(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        "/api/embed/referrals/payouts/tremendous/send-otp",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ email }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        setErrorMessage(result.error?.message);
        return;
      }

      toast.success("Verification code sent to your email.");
      setStep("verify");
      setCode("");
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  return (
    <div className="mt-6 space-y-2">
      <label
        htmlFor="tremendous-email"
        className="text-content-default block text-sm font-medium"
      >
        Payout email
      </label>
      <div className="flex items-center gap-2">
        <input
          id="tremendous-email"
          type="email"
          value={email}
          onChange={(e) => {
            setErrorMessage(null);
            setEmail(e.target.value);
          }}
          placeholder="you@example.com"
          className="border-border-default text-content-default bg-bg-default focus:border-border-emphasis min-w-0 flex-1 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-neutral-500"
        />
        <Button
          text={isSendingOtp ? "Sending..." : "Send code"}
          className="h-9 shrink-0 rounded-lg px-3"
          loading={isSendingOtp}
          onClick={sendOtp}
        />
      </div>
    </div>
  );
}

function TremendousPayoutVerifyStep() {
  const router = useRouter();
  const token = useEmbedToken();
  const { isMobile } = useMediaQuery();

  const { email, code, setCode, setStep, setErrorMessage } =
    usePayoutSettings();

  const [isVerifying, setIsVerifying] = useState(false);

  const verifyOtp = async () => {
    if (code.length !== 6) {
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        "/api/embed/referrals/payouts/tremendous/verify-otp",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ email, code }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        setErrorMessage(result.error?.message);
        setCode("");
        return;
      }

      toast.success("Payout email connected successfully!");
      router.refresh();
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="mt-6 space-y-4">
      <p className="text-content-subtle text-sm">
        Enter the six digit verification code sent to{" "}
        <span className="text-content-default font-medium">{email}</span>
      </p>
      <OTPInput
        maxLength={6}
        value={code}
        onChange={(value) => {
          setErrorMessage(null);
          setCode(value);
        }}
        autoFocus={!isMobile}
        render={({ slots }) => (
          <div className="flex w-full items-center justify-between gap-2">
            {slots.map(({ char, isActive, hasFakeCaret }, idx) => (
              <div
                key={idx}
                className={cn(
                  "relative flex h-14 w-12 items-center justify-center text-xl",
                  "border-border-default bg-bg-default rounded-lg border transition-all",
                  isActive &&
                    "border-border-emphasis ring-border-emphasis z-10 ring-2",
                )}
              >
                {char}
                {hasFakeCaret && (
                  <div className="animate-caret-blink pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="bg-content-emphasis h-5 w-px" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        onComplete={verifyOtp}
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button
          text={isVerifying ? "Verifying..." : "Verify"}
          className="h-9 rounded-lg"
          loading={isVerifying}
          disabled={code.length !== 6}
          onClick={verifyOtp}
        />
        <button
          type="button"
          className="text-content-subtle hover:text-content-default text-sm font-medium transition-colors sm:ml-auto"
          onClick={() => {
            setStep("email");
            setCode("");
            setErrorMessage(null);
          }}
        >
          Change email
        </button>
      </div>
    </div>
  );
}
