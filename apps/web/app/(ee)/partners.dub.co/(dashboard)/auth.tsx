"use client";

import usePartnerProfile from "@/lib/swr/use-partner-profile";
import useRefreshSession from "@/lib/swr/use-refresh-session";
import LayoutLoader from "@/ui/layout/layout-loader";
import { redirect, useSearchParams } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { toast } from "sonner";

const ERROR_CODES = {
  unauthorized:
    "Unauthorized. You must be logged in https://partners.dub.co to continue.",
  partner_not_found: "Partner profile not found.",
  invalid_state:
    "Invalid or expired state. Please try again from the beginning.",
  paypal_email_not_verified:
    "PayPal email address is not verified. Please verify your email address in PayPal and try again.",
} as const;

export function PartnerProfileAuth({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const { loading: sessionLoading } = useRefreshSession("defaultPartnerId");
  const { loading: partnerLoading, error } = usePartnerProfile();

  useEffect(() => {
    const error = searchParams?.get("error");

    if (error) {
      toast.error(ERROR_CODES[error] || "An unexpected error occurred.");
    }
  }, [searchParams]);

  const loading = sessionLoading || partnerLoading;

  if (loading) {
    return <LayoutLoader />;
  }

  if (!loading && error && error.status === 404) {
    redirect("/onboarding");
  }

  return children;
}
