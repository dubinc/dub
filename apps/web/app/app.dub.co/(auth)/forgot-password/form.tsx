"use client";

import { requestPasswordResetAction } from "@/lib/actions/request-password-reset";
import { Button, Input, useMediaQuery } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function ForgotPasswordForm() {
  const router = useRouter();
  const { isMobile } = useMediaQuery();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState(searchParams.get("email") || "");

  const { executeAsync, result, status, isExecuting } = useAction(
    requestPasswordResetAction,
    {
      onSuccess() {
        toast.success("Reset instructions sent! Redirecting to login...");
        router.push("/login");
      },
    },
  );

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
          await executeAsync({ email });
        }}
      >
        <div className="flex flex-col gap-8">
          <label>
            <span className="text-sm font-medium text-gray-700">
              Email Address
            </span>
            <Input
              type="email"
              autoFocus={!isMobile}
              value={email}
              placeholder="panic@thedis.co"
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
            />
          </label>
          <Button
            text={status === "executing" ? "Sending..." : "Send Reset Link"}
            type="submit"
            loading={isExecuting}
            disabled={email.length < 3}
          />
        </div>
      </form>
    </>
  );
}
