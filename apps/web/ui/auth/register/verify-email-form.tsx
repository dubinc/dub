"use client";

import { createUserAccountAction } from "@/lib/actions/create-user-account";
import { AnimatedSizeContainer, Button, useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { OTPInput } from "input-otp";
import { signIn } from "next-auth/react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useRegisterContext } from "./context";
import { ResendOtp } from "./resend-otp";

export const VerifyEmailForm = () => {
  const router = useRouter();
  const { isMobile } = useMediaQuery();
  const [code, setCode] = useState("");
  const { email, password } = useRegisterContext();
  const [isInvalidCode, setIsInvalidCode] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const { executeAsync, isPending } = useAction(createUserAccountAction, {
    async onSuccess() {
      toast.success("Account created! Redirecting to dashboard...");
      setIsRedirecting(true);

      const response = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (response?.ok) {
        router.push("/onboarding");
      } else {
        toast.error(
          "Failed to sign in with credentials. Please try again or contact support.",
        );
      }
    },
    onError({ error }) {
      toast.error(error.serverError);
      setCode("");
      setIsInvalidCode(true);
    },
  });

  if (!email || !password) {
    router.push("/register");
    return;
  }

  return (
    <div className="flex flex-col gap-3">
      <AnimatedSizeContainer height>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            executeAsync({ email, password, code });
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
                        "border-y border-r border-neutral-200 bg-white first:rounded-l-lg first:border-l last:rounded-r-lg",
                        "ring-0 transition-all",
                        isActive &&
                          "z-10 border border-neutral-500 ring-2 ring-neutral-200",
                        isInvalidCode && "border-red-500 ring-red-200",
                      )}
                    >
                      {char}
                      {hasFakeCaret && (
                        <div className="animate-caret-blink pointer-events-none absolute inset-0 flex items-center justify-center">
                          <div className="h-5 w-px bg-black" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              onComplete={() => {
                executeAsync({ email, password, code });
              }}
            />
            {isInvalidCode && (
              <p className="mt-2 text-center text-sm text-red-500">
                Invalid code. Please try again.
              </p>
            )}

            <Button
              className="mt-8"
              text={isPending ? "Verifying..." : "Continue"}
              type="submit"
              loading={isPending || isRedirecting}
              disabled={!code || code.length < 6}
            />
          </div>
        </form>

        <ResendOtp email={email} />
      </AnimatedSizeContainer>
    </div>
  );
};
