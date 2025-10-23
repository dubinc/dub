"use client";

import { Button, Input } from "@dub/ui";
import { useSendOtpCodeQuery } from "core/api/user/subscription/cancellation-opt-code/opt-code.hook";
import { trackClientEvents } from "core/integration/analytic";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FC, useState } from "react";

const MAX_ATTEMPTS = 5;

const EMAIL_REGEX =
  /^(?=.{1,200}$)([a-zA-Z0-9!#$%&'*+/=?^_`{|}~.-]{1,64})@([a-zA-Z0-9.-]{1,251}\.[a-zA-Z]{2,})$/;

const errorMessages = {
  subscription_cancelled: "Subscription cancelled",
  user_not_found: "User not found. Please check your email and try again.",
};

interface ICancelFlowEnterEmailModuleProps {
  pageName: string;
  sessionId: string;
}

export const CancelFlowEnterEmailModule: FC<
  Readonly<ICancelFlowEnterEmailModuleProps>
> = ({ pageName, sessionId }) => {
  const router = useRouter();

  const [attemptsCount, setAttemptsCount] = useState<number>(0);
  const hasTooManyAttempts = attemptsCount >= MAX_ATTEMPTS;

  const [value, setValue] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const { trigger: sendOtpCode, isMutating: isSendingOtpCode } =
    useSendOtpCodeQuery();

  const handleChangeEmail = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value.trim());
    setErrorMessage("");
  };

  const handleBlur = () => {
    if (value && !EMAIL_REGEX.test(value)) {
      setErrorMessage("Please enter a valid email address");
    }
  };

  const handleSubmit = async () => {
    if (!EMAIL_REGEX.test(value)) {
      setErrorMessage("Please enter a valid email address");
      return;
    }

    setAttemptsCount(attemptsCount + 1);

    setIsLoading(true);

    const response = await sendOtpCode({ email: value });

    trackClientEvents({
      event: EAnalyticEvents.EMAIL_SUBMITTED,
      params: {
        page_name: pageName,
        event_category: "nonAuthorized",
        email: value,
        flow_type: "cancel_subscription",
        status: !response?.error ? "success" : "failed",
        ...(response?.error
          ? {
              error_code: response?.error ?? "unknown_error",
              error_message:
                errorMessages?.[response?.error] || "An error occurred",
            }
          : {}),
      },
      sessionId,
    });

    if (!response?.success) {
      setErrorMessage(
        errorMessages[response?.error as keyof typeof errorMessages] ||
          "An error occurred",
      );
      setIsLoading(false);
      return;
    }

    router.push("/cancellation/auth/code");
  };

  const supportLink = (
    <Link
      className="font-semibold text-blue-500 underline"
      href="mailto:help@getqr.com"
    >
      help@getqr.com
    </Link>
  );

  return (
    <div className="md:py-18 mx-auto mt-4 flex w-full max-w-[470px] flex-col items-center justify-center gap-6 px-4 py-8 md:mt-6">
      <h1 className="text-center text-2xl font-semibold lg:text-2xl">
        Cancel Your Subscription
      </h1>
      <p className="text-default-700 text-center text-sm">
        Enter the email address associated with your account
      </p>
      <div className="flex w-full flex-col gap-3">
        <Input
          value={value}
          onChange={handleChangeEmail}
          onBlur={handleBlur}
          inputMode="email"
          autoCapitalize="none"
          className="border-border-500 focus:border-secondary block w-full px-3 py-2 placeholder-neutral-400 shadow-sm focus:outline-none sm:text-sm"
          error={errorMessage}
          placeholder="Email"
          containerClassName="w-full min-w-full max-w-full"
        />

        <Button
          loading={isLoading || isSendingOtpCode}
          onClick={handleSubmit}
          text="Continue"
        />
      </div>
      {errorMessage && (
        <p className="text-center">
          {hasTooManyAttempts ? (
            <span>
              You've made too many attempts to log in. Please contact{" "}
              {supportLink} if you need help - we're here 24/7 and typically
              respond within 15 minutes.
            </span>
          ) : (
            <span>Need help? Contact us at {supportLink}</span>
          )}
        </p>
      )}
    </div>
  );
};
