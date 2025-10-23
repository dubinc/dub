"use client";

import { Button, Input } from "@dub/ui";
import {
  useSendOtpCodeQuery,
  useVerifyOtpCodeQuery,
} from "core/api/user/subscription/cancellation-opt-code/opt-code.hook";
import {
  initPeopleAnalytic,
  trackClientEvents,
} from "core/integration/analytic";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface";
import { useRouter } from "next/navigation";
import { FC, useState } from "react";
import { TimerComponent } from "./elements/timer.component";

const CODE_REGEX = /^\d{6}$/;

const errorMessages = {
  invalid_code: "Invalid code. Please try again.",
  user_not_found: "User not found. Please check your email and try again.",
};

interface ICancelFlowEnterCodeModuleProps {
  email: string;
  sessionId: string;
  pageName: string;
}

export const CancelFlowEnterCodeModule: FC<
  Readonly<ICancelFlowEnterCodeModuleProps>
> = ({ email, sessionId, pageName }) => {
  const router = useRouter();

  const [value, setValue] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const { trigger: sendOtpCode, isMutating: isSendingOtpCode } =
    useSendOtpCodeQuery();
  const { trigger: validateEmail, isMutating: isEmailvalidating } =
    useVerifyOtpCodeQuery();

  const handleChangeCode = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value.trim());
    setErrorMessage("");
  };

  const handleBlur = () => {
    if (value && !CODE_REGEX.test(value)) {
      setErrorMessage("Please enter a valid email address");
    }
  };

  const handleResendCode = async (resetTimer: () => void) => {
    const response = await sendOtpCode({ email });

    if (response?.success) {
      resetTimer();
    }
  };

  const handleSubmit = async () => {
    if (!CODE_REGEX.test(value)) {
      setErrorMessage("Please enter a valid verification code");
      return;
    }

    setIsLoading(true);

    const response = await validateEmail({
      confirm_code: value,
      user_email: email,
    });

    trackClientEvents({
      event: EAnalyticEvents.CODE_SUBMITTED,
      params: {
        page_name: pageName,
        event_category: response?.error ? "nonAuthorized" : "Authorized",
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
      sessionId: response?.error ? sessionId : response?.data?.user_id,
    });

    if (!response?.success) {
      setErrorMessage(
        errorMessages[response?.error as keyof typeof errorMessages] ||
          "An error occurred",
      );
      setIsLoading(false);
      return;
    }

    initPeopleAnalytic(response.data?.user_id || "");

    router.push("/cancellation/feedback");
  };

  return (
    <div className="md:py-18 mx-auto mt-4 flex w-full max-w-[470px] flex-col items-center justify-center gap-6 px-4 py-8 md:mt-6">
      <h1 className="text-center text-2xl font-semibold lg:text-2xl">
        Check your email to continue
      </h1>
      <p className="text-center text-sm text-neutral-500">
        We've sent you a one-time code to{" "}
        <span className="text-blue-600">{email}</span>. Enter the code below:
      </p>
      <div className="flex w-full flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Input
            value={value}
            onChange={handleChangeCode}
            onBlur={handleBlur}
            inputMode="numeric"
            autoCapitalize="none"
            className="border-border-500 focus:border-secondary block w-full px-3 py-2 placeholder-neutral-400 shadow-sm focus:outline-none sm:text-sm"
            error={errorMessage}
            placeholder="Confirmation code"
            containerClassName="w-full min-w-full max-w-full"
          />

          <TimerComponent resendCode={handleResendCode} />
        </div>

        <Button
          loading={isLoading || isEmailvalidating}
          disabled={isSendingOtpCode}
          onClick={handleSubmit}
          text="Continue"
        />
      </div>
    </div>
  );
};
