"use client";

import { cn } from "@dub/utils";
import Link from "next/link";
import { RegisterProvider } from "./context";
import { SignUpForm } from "./signup-form";

type SignUpContentProps = {
  authModal?: boolean;
};

export function SignUpContent({ authModal = false }: SignUpContentProps) {
  return (
    <>
      <div
        className={cn("w-full max-w-md overflow-hidden", {
          "border-border-500 border-y sm:rounded-2xl sm:border sm:shadow-sm":
            !authModal,
        })}
      >
        <div
          className={cn(
            "border-border-500 border-b bg-white pb-6 pt-8 text-center",
            {
              "flex flex-col items-center justify-center border-none bg-neutral-50 pt-0":
                authModal,
            },
          )}
        >
          <h3 className="text-lg font-semibold">
            {authModal ? "One last step" : "Get started with GetQR"}
          </h3>
          {authModal && (
            <p className="max-w-[320px] text-base text-neutral-500">
              Create your free account to download your QR code instantly.
            </p>
          )}
        </div>
        <div
          className={cn("bg-neutral-50 px-4 py-8 sm:px-16", {
            "px-0 py-0 sm:px-0": authModal,
          })}
        >
          <RegisterProvider>
            <SignUpForm />
          </RegisterProvider>
        </div>
      </div>
      <p className="mt-4 text-center text-sm text-neutral-500">
        Already have an account?&nbsp;
        <Link
          href="/login"
          className="hover:text-neutral font-semibold text-neutral-500 underline underline-offset-2 transition-colors"
        >
          Log In
        </Link>
      </p>
    </>
  );
}
