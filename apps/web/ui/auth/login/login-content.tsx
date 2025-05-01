"use client";

import LoginForm from "@/ui/auth/login/login-form.tsx";
import { cn } from "@dub/utils/src";
import Link from "next/link";

type LoginContentProps = {
  authModal?: boolean;
};

export function LoginContent({ authModal = false }: LoginContentProps) {
  return (
    <>
      <div
        className={cn("w-full max-w-md overflow-hidden", {
          "border-border-500 border-y sm:rounded-2xl sm:border sm:shadow-sm":
            !authModal,
        })}
      >
        <div
          className={cn("text-center", {
            "border-border-500 border-b bg-white pb-6 pt-8": !authModal,
          })}
        >
          <h3 className="text-lg font-semibold">
            Sign in to your GetQR account
          </h3>
        </div>
        <div
          className={cn("bg-neutral-50 px-4 py-8 sm:px-16", {
            "px-0 py-4 sm:px-0": authModal,
          })}
        >
          <LoginForm />
        </div>
      </div>
      <p className="mt-4 text-center text-sm text-neutral-500">
        Don't have an account?&nbsp;
        <Link
          href="/register"
          className="hover:text-neutral font-semibold text-neutral-500 underline underline-offset-2 transition-colors"
        >
          Sign up
        </Link>
      </p>
    </>
  );
}
