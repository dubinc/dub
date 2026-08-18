"use client";

import { authClient } from "@/lib/better-auth/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

// To handle the IdP initiated login flow callback
export default function SAMLForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const processedCodes = useRef(new Set<string>());

  useEffect(() => {
    const code = searchParams?.get("code");

    if (!code) {
      toast.error("Missing SAML authorization code.");
      router.replace("/login");
      return;
    }

    if (processedCodes.current.has(code)) {
      return;
    }
    processedCodes.current.add(code);

    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await authClient.$fetch<{
          redirect: boolean;
          url?: string;
        }>("/sign-in/saml-idp", {
          method: "POST",
          body: { code },
        });

        if (cancelled) {
          return;
        }

        if (error) {
          toast.error(error.message || "Failed to complete SAML sign-in.");
          router.replace("/login");
          return;
        }

        window.location.href = data?.url || "/";
      } catch {
        if (cancelled) {
          return;
        }

        toast.error("Failed to complete SAML sign-in.");
        router.replace("/login");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, router]);

  return null;
}
