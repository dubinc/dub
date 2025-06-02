"use client";

import {
  RegisterProvider,
  useRegisterContext,
} from "@/ui/auth/register/context";
import { SignUpForm } from "@/ui/auth/register/signup-form";
import { VerifyEmailForm } from "@/ui/auth/register/verify-email-form";
import { truncate } from "@dub/utils";
import Link from "next/link";

export default function RegisterPageClient() {
  return (
    <RegisterProvider>
      <RegisterFlow />
    </RegisterProvider>
  );
}

function SignUp() {
  return (
    <>
      <div className="w-full max-w-sm">
        <h3 className="text-center text-xl font-semibold">
          Create your Dub account
        </h3>
        <div className="mt-8">
          <SignUpForm />
        </div>
      </div>
      <p className="mt-6 text-center text-sm font-medium text-neutral-500">
        Already have an account?&nbsp;
        <Link
          href="/login"
          className="font-semibold text-neutral-700 transition-colors hover:text-neutral-900"
        >
          Log in
        </Link>
      </p>
    </>
  );
}

function Verify() {
  const { email } = useRegisterContext();

  return (
    <>
      <div className="w-full max-w-md overflow-hidden border-y border-neutral-200 sm:rounded-2xl sm:border sm:shadow-sm">
        <div className="flex flex-col items-center justify-center gap-3 border-b border-neutral-200 bg-white px-4 pb-6 pt-8 text-center sm:px-16">
          <h3 className="text-xl font-semibold">Verify your email address</h3>
          <p className="text-sm text-neutral-500">
            Enter the six digit verification code sent to{" "}
            <strong className="font-medium text-neutral-600" title={email}>
              {truncate(email, 30)}
            </strong>
          </p>
        </div>
        <div className="bg-neutral-50 px-4 py-8 sm:px-16">
          <VerifyEmailForm />
        </div>
      </div>
      <p className="mt-4 text-center text-sm text-neutral-500">
        Already have an account?&nbsp;
        <Link
          href="/login"
          className="font-semibold text-neutral-500 underline underline-offset-2 transition-colors hover:text-black"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}

const RegisterFlow = () => {
  const { step } = useRegisterContext();

  if (step === "signup") return <SignUp />;
  if (step === "verify") return <Verify />;
};
