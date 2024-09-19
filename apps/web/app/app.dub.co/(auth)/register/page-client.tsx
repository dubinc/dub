"use client";

import { AuthLayout } from "@/ui/layout/auth-layout";
import { RegisterProvider, useRegisterContext } from "./context";
import { SignUpForm } from "./signup-form";
import { VerifyEmailForm } from "./verify-email-form";

export default function RegisterPageClient() {
  return (
    <AuthLayout>
      <RegisterProvider>
        <RegisterFlow />
      </RegisterProvider>
    </AuthLayout>
  );
}

const RegisterFlow = () => {
  const { step } = useRegisterContext();

  return (
    <>
      {step === "signup" && <SignUpForm />}
      {step === "verify" && <VerifyEmailForm />}
    </>
  );
};
