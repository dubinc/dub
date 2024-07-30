"use client";

import { verifyEmailAction } from "@/lib/actions/verify-email";
import { Button, Input } from "@dub/ui";
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
        toast.success("Success.");
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
        <div className="flex flex-col space-y-4">
          <Input
            type="text"
            placeholder="Enter OTP"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
          />
          <input type="hidden" value={email} />
          <Button
            text={status === "executing" ? "Verifying..." : "Continue"}
            type="submit"
            loading={isExecuting}
            disabled={!code}
          />
        </div>
      </form>
    </>
  );
}
