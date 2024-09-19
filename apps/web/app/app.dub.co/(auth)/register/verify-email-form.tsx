"use client";

import { createUserAccountAction } from "@/lib/actions/create-user-account";
import { AnimatedSizeContainer, Button, useMediaQuery } from "@dub/ui";
import { cn, truncate } from "@dub/utils";
import { OTPInput } from "input-otp";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
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

  const { executeAsync, isExecuting } = useAction(createUserAccountAction, {
    onSuccess() {
      toast.success("Email verified! Redirecting to login...");
      router.push("/login");
    },
    onError({ error }) {
      toast.error(error.serverError?.serverError);
      setCode("");
      setIsInvalidCode(true);
    },
  });

  if (!email || !password) {
    router.push("/register");
    return;
  }

  return (
    <>
      <div className="w-full max-w-md overflow-hidden border-y border-gray-200 sm:rounded-2xl sm:border sm:shadow-sm">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 bg-white px-4 py-6 pt-8 text-center sm:px-16">
          <h3 className="text-xl font-semibold">Verify your email address</h3>
          <p className="text-sm text-gray-500">
            Enter the six digit verification code sent to{" "}
            <strong className="font-medium text-gray-600" title={email}>
              {truncate(email, 30)}
            </strong>
          </p>
        </div>

        <div className="grid gap-3 bg-gray-50 px-4 py-8 sm:px-16">
          <AnimatedSizeContainer height>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeAsync({ email, password, code });
              }}
            >
              <div className="flex flex-col gap-8">
                <OTPInput
                  maxLength={6}
                  value={code}
                  onChange={setCode}
                  autoFocus={!isMobile}
                  containerClassName="group flex items-center justify-center"
                  render={({ slots }) => (
                    <div className="flex items-center">
                      {slots.map(({ char, isActive, hasFakeCaret }, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "relative flex h-14 w-10 items-center justify-center text-xl",
                            "border-y border-r border-gray-200 bg-white first:rounded-l-lg first:border-l last:rounded-r-lg",
                            "ring-0 transition-all",
                            isActive &&
                              "z-10 border border-gray-500 ring-2 ring-gray-200",
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

                <Button
                  text={isExecuting ? "Verifying..." : "Continue"}
                  type="submit"
                  loading={isExecuting}
                  disabled={!code || code.length < 6}
                />
              </div>
            </form>

            <ResendOtp email={email} />
          </AnimatedSizeContainer>
        </div>
      </div>

      <p className="mt-4 text-center text-sm text-gray-500">
        Already have an account?&nbsp;
        <Link
          href="/login"
          className="font-semibold text-gray-500 underline underline-offset-2 transition-colors hover:text-black"
        >
          Sign in
        </Link>
      </p>
    </>
  );
};
