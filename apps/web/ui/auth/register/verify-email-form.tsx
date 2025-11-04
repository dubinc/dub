"use client";

import { createUserAccountAction } from "@/lib/actions/create-user-account";
import { showMessage } from "@/ui/auth/helpers";
import { MessageType } from "@/ui/modals/auth-modal.tsx";
import { QRBuilderData } from "@/ui/qr-builder/types/types.ts";
import {
  AnimatedSizeContainer,
  Button,
  useLocalStorage,
  useMediaQuery,
} from "@dub/ui";
import { cn } from "@dub/utils";
import slugify from "@sindresorhus/slugify";
import { setPeopleAnalyticOnce } from "core/integration/analytic/services/analytic.service.ts";
import { OTPInput } from "input-otp";
import { signIn } from "next-auth/react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useRegisterContext } from "./context";
import { ResendOtp } from "./resend-otp";

export const VerifyEmailForm = ({
  sessionId,
  authModal = false,
  setAuthModalMessage,
}: {
  sessionId: string;
  authModal?: boolean;
  setAuthModalMessage?: (message: string | null, type: MessageType) => void;
}) => {
  const router = useRouter();
  const { isMobile } = useMediaQuery();
  const [code, setCode] = useState("");
  const { email, password } = useRegisterContext();
  const [isInvalidCode, setIsInvalidCode] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const [qrDataToCreate, setQrDataToCreate] =
    useLocalStorage<QRBuilderData | null>("qr-data-to-create", null);

  const { executeAsync, isPending } = useAction(createUserAccountAction, {
    async onSuccess() {
      setPeopleAnalyticOnce({ signup_method: "email" });

      if (authModal && setAuthModalMessage) {
        setAuthModalMessage("Account created! Redirecting to dashboard...", "success");
      } else {
        showMessage(
          "Account created! Redirecting to dashboard...",
          "success",
        );
      }
      setIsRedirecting(true);
      setQrDataToCreate(null);
      const response = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (response?.ok) {
        router.push(`/${slugify(email)}?onboarded=true`);
      } else {
        if (authModal && setAuthModalMessage) {
          setAuthModalMessage("Failed to sign in with credentials. Please try again or contact support.", "error");
          return;
        }
        showMessage(
          "Failed to sign in with credentials. Please try again or contact support.",
          "error",
        );
      }
    },
    onError({ error }) {
      const serverError = error.serverError || "";
      const validationError = error.validationErrors?.code?.[0] || "";
      const fullErrorMessage =
        serverError || validationError || "An error occurred";

      const codeMatch = fullErrorMessage.match(/^\[([^\]]+)\]/);
      const errorCode = codeMatch ? codeMatch[1] : "unknown-error";
      const errorMessage = codeMatch
        ? fullErrorMessage.replace(/^\[[^\]]+\]\s*/, "")
        : fullErrorMessage;

      console.error("Auth error:", { code: errorCode, message: errorMessage });

      if (authModal && setAuthModalMessage) {
        setAuthModalMessage(errorMessage, "error");
      } else {
        showMessage(
          errorMessage,
          "error",
        );
      }
      setCode("");
      setIsInvalidCode(true);
    },
  });

  if (!email || !password) {
    router.push("/register");
    return;
  }

  const handleSubmit = async () => {
    await executeAsync({
      email,
      password,
      code,
      qrDataToCreate,
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <AnimatedSizeContainer height>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await handleSubmit();
          }}
        >
          <div>
            <OTPInput
              maxLength={6}
              value={code}
              onChange={(code) => {
                setIsInvalidCode(false);
                setCode(code);
              }}
              autoFocus={!isMobile}
              containerClassName="group flex items-center justify-center"
              render={({ slots }) => (
                <div className="flex items-center">
                  {slots.map(({ char, isActive, hasFakeCaret }, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "relative flex h-14 w-10 items-center justify-center text-xl",
                        "border-border-500 border-y border-r bg-white first:rounded-l-lg first:border-l last:rounded-r-lg",
                        "ring-0 transition-all",
                        isActive &&
                          "z-10 border border-neutral-500 ring-2 ring-neutral-200",
                        isInvalidCode && "border-red-500 ring-red-200",
                      )}
                    >
                      {char}
                      {hasFakeCaret && (
                        <div className="animate-caret-blink pointer-events-none absolute inset-0 flex items-center justify-center">
                          <div className="bg-neutral h-5 w-px" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              onComplete={handleSubmit}
            />
            {isInvalidCode && (
              <p className="mt-2 text-center text-sm text-red-500">
                Invalid code. Please try again.
              </p>
            )}

            <Button
              className="border-border-500 mt-8"
              text={isPending ? "Verifying..." : "Continue"}
              type="submit"
              loading={isPending || isRedirecting}
              disabled={!code || code.length < 6}
            />
          </div>
        </form>

        <ResendOtp
          email={email}
          authModal={authModal}
          setAuthModalMessage={setAuthModalMessage}
        />
      </AnimatedSizeContainer>
    </div>
  );
};
