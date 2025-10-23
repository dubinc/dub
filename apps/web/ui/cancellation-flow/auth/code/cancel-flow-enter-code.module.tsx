"use client";

import { Button, Input } from "@dub/ui";
import { useVerifyOtpCodeQuery } from "core/api/user/subscription/cancellation-opt-code/opt-code.hook";
import { useRouter } from "next/navigation";
import { FC, useState } from "react";

const pageName = "cancel_flow_email_verification";

const CODE_REGEX = /^\d{6}$/;

const errorMessages = {
  subscription_cancelled: "Subscription cancelled",
  user_not_found: "User not found. Please check your email and try again.",
};

interface ICancelFlowEnterCodeModuleProps {
  email: string;
}

export const CancelFlowEnterCodeModule: FC<
  Readonly<ICancelFlowEnterCodeModuleProps>
> = ({ email }) => {
  const router = useRouter();

  const [value, setValue] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const { trigger: validateEmail, isMutating: isSendingOtpCode } =
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

  const handleSubmit = async () => {
    if (!CODE_REGEX.test(value)) {
      setErrorMessage("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    const response = await validateEmail({
      confirm_code: value,
      user_email: email,
    });

    if (!response?.success) {
      setErrorMessage(
        errorMessages[response?.error as keyof typeof errorMessages] ||
          "An error occurred",
      );
      setIsLoading(false);
      return;
    }

    router.push("/cancellation");
  };

  return (
    <div className="md:py-18 mx-auto mt-4 flex w-full max-w-[470px] flex-col items-center justify-center gap-6 px-4 py-8 md:mt-6">
      <h1 className="text-center text-2xl font-semibold lg:text-2xl">
        Check your email to continue
      </h1>
      <p className="text-default-700 text-center text-sm">
        We've sent you a one-time code to{" "}
        <span className="text-blue-600">{email}</span>. Enter the code below:
      </p>
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

      <Button
        loading={isLoading || isSendingOtpCode}
        onClick={handleSubmit}
        text="Continue"
      />
    </div>
  );
};
