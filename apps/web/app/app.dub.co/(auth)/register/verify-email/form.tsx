"use client";

import { verifyEmailAction } from "@/lib/actions/verify-email";
import { Button } from "@dub/ui";
import { cn } from "@dub/utils";
import { OTPInput } from "input-otp";
import { useAction } from "next-safe-action/hooks";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function VerifyEmailForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const searchParams = useSearchParams();

  const { executeAsync, result, status, isExecuting } = useAction(
    verifyEmailAction,
    {
      onSuccess() {
        toast.success("Email verified! Redirecting to login...");
        router.push("/login");
      },
    },
  );

  const email = searchParams.get("email");

  if (!email) {
    router.push("/register");
    return;
  }

  return (
    <>
      {result.serverError && (
        <div className="rounded-md bg-red-100 p-3 text-red-900 dark:bg-red-900 dark:text-red-200">
          <div className="relative flex md:flex-row">
            <div className="flex flex-grow flex-col sm:flex-row">
              <div className="ltr:ml-3 rtl:mr-3">
                <h3 className="text-sm font-medium">
                  {result.serverError.serverError}
                </h3>
              </div>
            </div>
          </div>
        </div>
      )}

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await executeAsync({ email, code });
        }}
      >
        <div className="flex flex-col gap-8">
          <OTPInput
            maxLength={6}
            value={code}
            onChange={setCode}
            autoFocus
            containerClassName="group flex items-center justify-center"
            render={({ slots }) => (
              <div className="flex items-center">
                {slots.map(({ char, isActive, hasFakeCaret }, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "relative flex h-14 w-10 items-center justify-center text-xl",
                      "border-y border-r border-gray-200 bg-white first:rounded-l-lg first:border-l last:rounded-r-lg",
                      "ring ring-0 transition-all",
                      isActive &&
                        "z-10 border border-gray-500 ring-4 ring-gray-200",
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
          />
          <input type="hidden" value={email} />
          <Button
            text={status === "executing" ? "Verifying..." : "Continue"}
            type="submit"
            loading={isExecuting}
            disabled={!code || code.length < 6}
          />
        </div>
      </form>
    </>
  );
}
