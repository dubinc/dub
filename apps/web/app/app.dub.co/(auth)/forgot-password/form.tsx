"use client";

import { requestPasswordResetAction } from "@/lib/actions/request-password-reset";
import { Button, Input, useMediaQuery } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export const ForgotPasswordForm = () => {
  const router = useRouter();
  const { isMobile } = useMediaQuery();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");

  const { executeAsync, isExecuting } = useAction(requestPasswordResetAction, {
    onSuccess() {
      toast.success(
        "You will receive an email with instructions to reset your password.",
      );
      router.push("/login");
    },
    onError({ error }) {
      toast.error(error.serverError?.serverError);
    },
  });

  return (
    <>
      <div className="w-full max-w-md overflow-hidden border-y border-gray-200 sm:rounded-2xl sm:border sm:shadow-sm">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 bg-white px-4 py-6 pt-8 text-center sm:px-16">
          <h3 className="text-xl font-semibold">Reset your password</h3>
        </div>

        <div className="grid gap-3 bg-gray-50 px-4 py-8 sm:px-16">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              executeAsync({ email });
            }}
          >
            <div className="flex flex-col gap-8">
              <label>
                <span className="text-sm font-medium text-gray-700">Email</span>
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
                type="submit"
                text={isExecuting ? "Sending..." : "Send reset link"}
                loading={isExecuting}
                disabled={email.length < 3}
              />
            </div>
          </form>
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
