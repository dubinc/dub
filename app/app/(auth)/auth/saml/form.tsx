"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

// To handle the IdP initiated login flow callback
export default function SAMLForm() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams?.get("code");

    signIn("saml-idp", {
      callbackUrl: "/",
      code,
    });
  }, []);

  return null;
}
