"use client";

import LoginForm from "@/ui/auth/login/login-form";

export function PartnerLoginForm({ next }: { next: string }) {
  // TODO:
  // Use fingerprintjs

  return <LoginForm methods={["email", "password", "google"]} next={next} />;
}
