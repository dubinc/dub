"use client";

import { Button, Logo } from "@dub/ui";
import { HOME_DOMAIN } from "@dub/utils";
import { Suspense } from "react";
import SignUpEmail from "./signup-email";
import SignupOAuth from "./signup-oauth";

export default function SignUpForm({
  setAuthView,
}: {
  setAuthView: (view: "signup" | "otp") => void;
}) {
  return (
    <div className="col-span-1 flex items-center justify-center md:col-span-3">
      <div className="w-full max-w-md overflow-hidden border-y border-gray-200 sm:rounded-2xl sm:border sm:shadow-xl">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 bg-white px-4 py-6 pt-8 text-center sm:px-16">
          <a href={HOME_DOMAIN}>
            <Logo className="h-10 w-10" />
          </a>
          <h3 className="text-xl font-semibold">
            Create your {process.env.NEXT_PUBLIC_APP_NAME} account
          </h3>
          <p className="text-sm text-gray-500">
            By signing up, you agree to our <br />
            <a
              href="https://dub.co/terms"
              target="_blank"
              className="font-medium underline underline-offset-4 hover:text-gray-700"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="https://dub.co/privacy"
              target="_blank"
              className="font-medium underline underline-offset-4 hover:text-gray-700"
            >
              Privacy Policy
            </a>
          </p>
        </div>
        <div className="flex flex-col gap-5 bg-gray-50 px-4 py-8 sm:px-16">
          <SignUpEmail setAuthView={setAuthView} />

          <div className="relative flex items-center">
            <div className="border-subtle flex-grow border-t" />
            <span className="text-subtle leadning-none mx-2 flex-shrink text-sm font-normal text-gray-700">
              Or continue with
            </span>
            <div className="border-subtle flex-grow border-t" />
          </div>

          <div className="space-y-3">
            <Suspense
              fallback={
                <>
                  <Button disabled={true} text="" variant="secondary" />
                  <div className="mx-auto h-5 w-3/4 rounded-lg bg-gray-100" />
                </>
              }
            >
              <SignupOAuth />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
