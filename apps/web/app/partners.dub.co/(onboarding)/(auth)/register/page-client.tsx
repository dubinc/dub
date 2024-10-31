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
      <div className="mx-auto my-10 w-full max-w-md md:mt-16 lg:mt-20">
        <RegisterFlow />
      </div>
    </RegisterProvider>
  );
}

function SignUp() {
  return (
    <>
      <div className="rounded-lg border border-neutral-200 bg-white p-8 pb-10">
        <h1 className="text-lg font-medium text-neutral-800">
          Create a Dub Partner account
        </h1>
        <div className="mt-8">
          <SignUpForm methods={["email", "google"]} />
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
}

function Verify() {
  const { email } = useRegisterContext();

  return (
    <>
      <div className="rounded-lg border border-neutral-200 bg-white p-8 pb-10">
        <h1 className="text-lg font-medium text-neutral-800">
          Verify your email address
        </h1>
        <p className="mt-3 text-sm text-gray-500">
          Enter the six digit verification code sent to{" "}
          <strong className="font-medium text-gray-600" title={email}>
            {truncate(email, 30)}
          </strong>
        </p>
        <div className="mt-8">
          <VerifyEmailForm />
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
}

const RegisterFlow = () => {
  const { step } = useRegisterContext();

  if (step === "signup") return <SignUp />;
  if (step === "verify") return <Verify />;
};
