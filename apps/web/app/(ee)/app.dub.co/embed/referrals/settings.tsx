"use client";

import { TREMENDOUS_MAX_PAYOUT_AMOUNT_CENTS } from "@/lib/tremendous/constants";
import { AlertCircleFill } from "@/ui/shared/icons";
import {
  AnimatedSizeContainer,
  Badge,
  Button,
  Gift,
  MoneyBill,
  Tooltip,
  useMediaQuery,
} from "@dub/ui";
import { cn, currencyFormatter } from "@dub/utils/src";
import { OTPInput } from "input-otp";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import type { ComponentType, Dispatch, FormEvent, SetStateAction } from "react";
import { useEffect, useState } from "react";
import { useEmbedToken } from "../use-embed-token";
import { useReferralsEmbedData } from "./page-client";

type GiftCardPanel = "collapsed" | "email" | "verify";

function PayoutMethodButton({
  text,
  variant,
  className,
  disabled,
  disabledTooltip,
  onClick,
}: {
  text: string;
  variant: "primary" | "secondary";
  className?: string;
  disabled?: boolean;
  disabledTooltip?: string;
  onClick?: () => void;
}) {
  if (disabledTooltip) {
    return (
      <Tooltip
        content={disabledTooltip}
        contentClassName="text-content-default dark:prose-invert dark:prose-a:text-neutral-400 dark:hover:prose-a:text-neutral-300"
      >
        <div
          className={cn(
            "border-border-subtle bg-bg-subtle text-content-subtle flex cursor-not-allowed items-center justify-center whitespace-nowrap rounded-lg border text-sm",
            className,
          )}
        >
          {text}
        </div>
      </Tooltip>
    );
  }

  return (
    <Button
      className={className}
      text={text}
      variant={variant}
      disabled={disabled}
      onClick={onClick}
    />
  );
}

function SettingsErrorAlert({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="bg-bg-error text-content-error border-border-error mb-3 flex items-start gap-2 rounded-lg border px-3 py-2.5"
    >
      <AlertCircleFill className="mt-0.5 size-4 shrink-0" />
      <p className="text-sm font-medium leading-5">{message}</p>
    </div>
  );
}

function TremendousEmailForm({
  initialEmail,
  onSuccess,
  errorMessage,
  setErrorMessage,
}: {
  initialEmail: string;
  onSuccess: (email: string) => void;
  errorMessage: string | null;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
}) {
  const token = useEmbedToken();
  const [email, setEmail] = useState(initialEmail);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email) {
      setErrorMessage("Please enter an email address.");
      return;
    }

    setIsSendingOtp(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/embed/referrals/tremendous/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (!response.ok) {
        setErrorMessage(
          result.error?.message ?? "Something went wrong. Please try again.",
        );
        return;
      }

      onSuccess(email);
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  return (
    <div className="bg-bg-muted border-border-subtle border-t p-3">
      {errorMessage && <SettingsErrorAlert message={errorMessage} />}
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-3"
        noValidate={false}
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <label
            htmlFor="tremendous-email"
            className="text-content-emphasis block text-sm font-medium"
          >
            Email
          </label>
          <input
            id="tremendous-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrorMessage(null);
            }}
            placeholder="panic@thedis.co"
            required
            className="border-border-subtle text-content-default bg-bg-default focus:border-border-emphasis h-9 w-full rounded-lg border px-3 text-sm focus:outline-none focus:ring-neutral-500 dark:focus:border-neutral-400 dark:focus:ring-neutral-400"
          />
        </div>
        <Button
          type="submit"
          text={isSendingOtp ? "Saving..." : "Save"}
          className="h-9 w-fit shrink-0 rounded-lg px-4"
          loading={isSendingOtp}
        />
      </form>
    </div>
  );
}

function TremendousOtpVerifyForm({
  email,
  onSuccess,
  errorMessage,
  setErrorMessage,
}: {
  email: string;
  onSuccess: () => void;
  errorMessage: string | null;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
}) {
  const router = useRouter();
  const token = useEmbedToken();
  const { isMobile } = useMediaQuery();
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const verifyOtp = async () => {
    if (code.length !== 6) {
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        "/api/embed/referrals/tremendous/verify-otp",
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
        setErrorMessage(
          result.error?.message ?? "Something went wrong. Please try again.",
        );
        setCode("");
        return;
      }

      router.refresh();
      onSuccess();
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="bg-bg-muted border-border-subtle border-t p-3">
      {errorMessage && <SettingsErrorAlert message={errorMessage} />}
      <p className="text-content-subtle text-sm">
        Enter the six digit verification code sent to{" "}
        <span className="text-content-default font-medium">{email}</span>
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <OTPInput
          maxLength={6}
          value={code}
          onChange={(value) => {
            setCode(value);
            setErrorMessage(null);
          }}
          autoFocus={!isMobile}
          render={({ slots }) => (
            <div className="flex items-center gap-1.5">
              {slots.map(({ char, isActive, hasFakeCaret }, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "relative flex size-10 items-center justify-center text-lg font-medium",
                    "text-content-emphasis border-border-default bg-bg-default rounded-lg border transition-all",
                    isActive &&
                      "border-border-emphasis ring-border-emphasis z-10 ring-2",
                  )}
                >
                  {char}
                  {hasFakeCaret && (
                    <div className="animate-caret-blink pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="bg-content-emphasis h-4 w-px" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          onComplete={verifyOtp}
        />
        <Button
          text={isVerifying ? "Verifying..." : "Verify"}
          className="h-9 w-fit shrink-0 rounded-lg"
          loading={isVerifying}
          disabled={code.length !== 6}
          onClick={verifyOtp}
        />
      </div>
    </div>
  );
}

function PayoutMethodCard({
  label,
  icon: Icon,
  isConnected,
  showRecommendedBadge,
  buttonText,
  disabled,
  disabledTooltip,
  onClick,
}: {
  label: string;
  icon: ComponentType<{ className?: string }>;
  isConnected: boolean;
  showRecommendedBadge?: boolean;
  buttonText?: string;
  disabled?: boolean;
  disabledTooltip?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={cn(
        "border-border-subtle flex items-center rounded-lg border p-3",
        !isConnected && "bg-bg-muted",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="border-border-muted bg-bg-default flex size-8 shrink-0 items-center justify-center rounded-lg border">
          <Icon className="text-content-emphasis size-[18px]" />
        </div>
        <h2 className="text-content-emphasis text-sm font-semibold">{label}</h2>
        {showRecommendedBadge && (
          <Badge
            variant="blue"
            className="rounded-md px-1 py-0 text-xs font-semibold"
          >
            Recommended
          </Badge>
        )}

        {isConnected && (
          <Badge
            variant="green"
            className="rounded-md px-1 py-0 text-xs font-semibold"
          >
            Connected
          </Badge>
        )}
      </div>

      <PayoutMethodButton
        className="h-8 w-fit shrink-0 rounded-lg px-3 py-2"
        text={buttonText ?? (isConnected ? "Edit" : "Connect")}
        variant={isConnected ? "secondary" : "primary"}
        disabled={disabled}
        disabledTooltip={disabledTooltip}
        onClick={onClick}
      />
    </div>
  );
}

function TremendousGiftCardOption({
  isConnected,
  hasAnyConnected,
  tremendousEmail,
}: {
  isConnected: boolean;
  hasAnyConnected: boolean;
  tremendousEmail: string | null;
}) {
  const [panel, setPanel] = useState<GiftCardPanel>("collapsed");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState("");

  const disabled = (hasAnyConnected && !isConnected) || isConnected;
  const disabledTooltip = isConnected
    ? `Your payouts are currently connected to ${tremendousEmail ?? "your email"}. Please contact support if you need to update your payout email.`
    : disabled
      ? "This payout method is unavailable because you already have another payout method connected."
      : undefined;

  const isExpanded = panel !== "collapsed";

  return (
    <div
      className={cn(
        "border-border-subtle overflow-hidden rounded-lg border",
        !isConnected && "bg-bg-muted",
        hasAnyConnected && !isConnected && "opacity-50",
      )}
    >
      <div className="flex items-center gap-3 p-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="border-border-muted bg-bg-default flex size-8 shrink-0 items-center justify-center rounded-lg border">
            <Gift className="text-content-emphasis size-[18px]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-content-emphasis text-sm font-semibold">
                Gift Cards
              </h2>
              {!hasAnyConnected && (
                <Badge
                  variant="blue"
                  className="rounded-md px-1 py-0 text-xs font-semibold"
                >
                  Recommended
                </Badge>
              )}
              {isConnected && (
                <Badge
                  variant="green"
                  className="rounded-md px-1 py-0 text-xs font-semibold"
                >
                  Connected
                </Badge>
              )}
            </div>
            <p className="text-content-subtle mt-0.5 text-xs">
              Gift card payouts are limited to{" "}
              {currencyFormatter(TREMENDOUS_MAX_PAYOUT_AMOUNT_CENTS)} per
              payout.
            </p>
          </div>
        </div>

        {!isExpanded ? (
          <PayoutMethodButton
            text={isConnected ? "Edit" : "Connect"}
            className="h-8 w-fit shrink-0 rounded-lg px-3 py-2"
            variant={isConnected ? "secondary" : "primary"}
            disabled={disabled}
            disabledTooltip={disabledTooltip}
            onClick={() => {
              setPanel("email");
              setErrorMessage(null);
            }}
          />
        ) : (
          <Button
            text="Cancel"
            className="h-8 w-fit shrink-0 rounded-lg px-3 py-2"
            variant="secondary"
            onClick={() => {
              setPanel("collapsed");
              setErrorMessage(null);
            }}
          />
        )}
      </div>

      <AnimatePresence initial={false} mode="wait">
        {isExpanded && (
          <motion.div
            key={panel}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <AnimatedSizeContainer height>
              {panel === "email" ? (
                <TremendousEmailForm
                  initialEmail={tremendousEmail ?? ""}
                  onSuccess={(email) => {
                    setVerifiedEmail(email);
                    setPanel("verify");
                    setErrorMessage(null);
                  }}
                  errorMessage={errorMessage}
                  setErrorMessage={setErrorMessage}
                />
              ) : (
                <TremendousOtpVerifyForm
                  email={verifiedEmail}
                  onSuccess={() => {
                    setPanel("collapsed");
                    setErrorMessage(null);
                  }}
                  errorMessage={errorMessage}
                  setErrorMessage={setErrorMessage}
                />
              )}
            </AnimatedSizeContainer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CashPayoutMethod({
  isConnected,
  hasAnyConnected,
}: {
  isConnected: boolean;
  hasAnyConnected: boolean;
}) {
  const disabled = hasAnyConnected && !isConnected;

  return (
    <PayoutMethodCard
      label="Cash"
      icon={MoneyBill}
      isConnected={isConnected}
      buttonText={isConnected ? "Settings" : "Connect"}
      disabled={disabled}
      disabledTooltip={
        disabled
          ? "This payout method is unavailable because you already have another payout method connected."
          : undefined
      }
      onClick={() => {
        window.open("https://partners.dub.co/payouts?settings=true", "_blank");
      }}
    />
  );
}

export function ReferralsEmbedSettings() {
  const { partner } = useReferralsEmbedData();

  const hasAnyConnected = Boolean(partner.defaultPayoutMethod);
  const isGiftCardConnected = partner.defaultPayoutMethod === "tremendous";
  const isCashConnected = hasAnyConnected && !isGiftCardConnected;

  return (
    <div className="border-border-muted bg-bg-default space-y-4 rounded-lg border p-4 sm:p-6">
      <div className="space-y-1">
        <h3 className="text-content-emphasis text-base font-semibold">
          Payout method
        </h3>
        <p className="text-content-subtle text-sm">
          Select your payout method.{" "}
          <span className="text-content-default font-medium">
            This can&apos;t be changed after a method is connected.
          </span>
        </p>
      </div>

      <div className="space-y-4">
        <TremendousGiftCardOption
          isConnected={isGiftCardConnected}
          hasAnyConnected={hasAnyConnected}
          tremendousEmail={partner.tremendousEmail}
        />
        <CashPayoutMethod
          isConnected={isCashConnected}
          hasAnyConnected={hasAnyConnected}
        />
      </div>
    </div>
  );
}
