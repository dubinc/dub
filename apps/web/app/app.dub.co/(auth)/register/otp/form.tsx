"use client";

import { createNewAccount } from "@/lib/actions/create-new-account";
import { Button, Input, Logo } from "@dub/ui";
import { HOME_DOMAIN } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function VerifyOTPForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const { executeAsync, result, status, isExecuting } =
    useAction(createNewAccount);

  const onSubmit = async () => {
    // await executeAsync(data);
    // if (status === "hasSucceeded") {
    //   toast.success("account created");
    //   reset();
    // }
  };

  return (
    <div className="col-span-1 flex items-center justify-center md:col-span-3">
      <div className="w-full max-w-md overflow-hidden border-y border-gray-200 sm:rounded-2xl sm:border sm:shadow-xl">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 bg-white px-4 py-6 pt-8 text-center sm:px-16">
          <a href={HOME_DOMAIN}>
            <Logo className="h-10 w-10" />
          </a>
          <h3 className="text-xl font-semibold">Verification code sent</h3>
          <p className="text-sm text-gray-500">
            Please enter the 6 digits verification code sent to your email
            address.
          </p>
        </div>
        <div className="flex flex-col gap-5 bg-gray-50 px-4 py-8 sm:px-16">
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

            <form onSubmit={onSubmit}>
              <div className="flex flex-col space-y-4">
                <Input
                  required
                  type="text"
                  placeholder="Enter OTP"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
                <Button
                  text={status === "executing" ? "Verifying..." : "Continue"}
                  type="submit"
                  loading={isExecuting}
                  disabled={!code}
                />
              </div>
            </form>
          </>
        </div>
      </div>
    </div>
  );
}
