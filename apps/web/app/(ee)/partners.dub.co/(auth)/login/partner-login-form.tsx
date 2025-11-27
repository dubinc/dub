"use client";

import LoginForm from "@/ui/auth/login/login-form";
import { useVisitorData } from "@fingerprintjs/fingerprintjs-pro-react";

export function PartnerLoginForm({ next }: { next: string }) {
  const { data: visitorData } = useVisitorData(
    {
      extendedResult: false,
    },
    {
      immediate: true,
    },
  );

  return (
    <LoginForm
      methods={["email", "password", "google"]}
      next={next}
      requestId={visitorData?.requestId}
    />
  );
}
