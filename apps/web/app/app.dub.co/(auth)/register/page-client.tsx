"use client";

import { RegisterProvider, useRegisterContext } from "./context";
import { SignUpForm } from "./signup-form";
import { VerifyEmailForm } from "./verify-email-form";

export default function RegisterPageClient() {
  return (
    <RegisterProvider>
      <RegisterFlow />
    </RegisterProvider>
  );
}

const RegisterFlow = () => {
  const { step } = useRegisterContext();

  if (step === "signup") {
    return <SignUpForm />;
  }

  if (step === "verify") {
    return <VerifyEmailForm />;
  }
};
