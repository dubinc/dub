"use client";

import { sendOtpAction } from "@/lib/actions/send-otp";
import { showMessage } from "@/ui/auth/helpers";
import { MessageType } from "@/ui/modals/auth-modal.tsx";
import { LoadingSpinner } from "@dub/ui";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";

export const ResendOtp = ({
  email,
  authModal,
  setAuthModalMessage,
}: {
  email: string;
  authModal?: boolean;
  setAuthModalMessage?: (message: string | null, type: MessageType) => void;
}) => {
  const [delaySeconds, setDelaySeconds] = useState(0);
  const [state, setState] = useState<"default" | "success" | "error">(
    "default",
  );

  const { executeAsync, isPending } = useAction(sendOtpAction, {
    onSuccess: () => {
      setState("success");
      showMessage(
        "Code resent successfully",
        "success",
        authModal,
        setAuthModalMessage,
      );
    },
    onError: () => {
      setState("error");
      showMessage(
        "Failed to resend code",
        "error",
        authModal,
        setAuthModalMessage,
      );
    },
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
    <div className="relative mt-4 text-center text-sm text-neutral-500">
      {state === "default" && (
        <>
          {isPending && (
            <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 pr-1.5">
              <LoadingSpinner className="h-3 w-3" />
            </div>
          )}

          <p className={cn(isPending && "opacity-80")}>
            Didn't receive a code?{" "}
            <button
              onClick={() => executeAsync({ email })}
              className={cn(
                "hover:text-neutral font-semibold text-neutral-500 underline underline-offset-2 transition-colors",
                isPending && "pointer-events-none",
              )}
            >
              Resend
            </button>
          </p>
        </>
      )}

      {state === "success" && (
        <p className="text-sm text-neutral-500">
          Code sent successfully. <Delay seconds={delaySeconds} />
        </p>
      )}

      {state === "error" && (
        <p className="text-sm text-neutral-500">
          Failed to send code. <Delay seconds={delaySeconds} />
        </p>
      )}
    </div>
  );
};

const Delay = ({ seconds }: { seconds: number }) => {
  return (
    <span className="ml-1 text-sm tabular-nums text-neutral-400">
      {seconds}s
    </span>
  );
};
