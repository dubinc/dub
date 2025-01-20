"use client";
import { useTranslations } from "next-intl";

import { sendOtpAction } from "@/lib/actions/send-otp";
import { LoadingSpinner } from "@dub/ui";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";

export const ResendOtp = ({ email }: { email: string }) => {
  const t = useTranslations("../ui/auth/register");

  const [delaySeconds, setDelaySeconds] = useState(0);
  const [state, setState] = useState<"default" | "success" | "error">(
    "default",
  );

  const { executeAsync, isExecuting } = useAction(sendOtpAction, {
    onSuccess: () => setState("success"),
    onError: () => setState("error"),
  });

  useEffect(() => {
    if (state === "success") {
      setDelaySeconds(60);
    } else if (state === "error") {
      setDelaySeconds(5);
    }
  }, [state]);

  useEffect(() => {
    if (delaySeconds > 0) {
      const interval = setInterval(
        () => setDelaySeconds(delaySeconds - 1),
        1000,
      );

      return () => clearInterval(interval);
    } else {
      setState("default");
    }
  }, [delaySeconds]);

  return (
    <div className="relative mt-4 text-center text-sm text-gray-500">
      {state === "default" && (
        <>
          {isExecuting && (
            <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 pr-1.5">
              <LoadingSpinner className="h-3 w-3" />
            </div>
          )}

          <p className={cn(isExecuting && "opacity-80")}>
            {t("did-not-receive-code")}
            <button
              onClick={() => executeAsync({ email })}
              className={cn(
                "font-semibold text-gray-500 underline underline-offset-2 transition-colors hover:text-black",
                isExecuting && "pointer-events-none",
              )}
            >
              {t("resend-code")}
            </button>
          </p>
        </>
      )}

      {state === "success" && (
        <p className="text-sm text-gray-500">
          {t("code-sent-successfully")}
          <Delay seconds={delaySeconds} />
        </p>
      )}

      {state === "error" && (
        <p className="text-sm text-gray-500">
          {t("failed-to-send-code")}
          <Delay seconds={delaySeconds} />
        </p>
      )}
    </div>
  );
};

const Delay = ({ seconds }: { seconds: number }) => {
  const t = useTranslations("../ui/auth/register");

  return (
    <span className="ml-1 text-sm tabular-nums text-gray-400">
      {t("seconds-remaining", { seconds: seconds })}
    </span>
  );
};
