"use client";

import { EmptyState, LoadingSpinner } from "@dub/ui";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export default function ConfirmEmailChangePageClient({
  isPartnerProfile,
  redirectTo,
}: {
  isPartnerProfile: boolean;
  redirectTo?: "/profile" | "/account/settings";
}) {
  const router = useRouter();
  const { update, status } = useSession();
  const hasUpdatedSession = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || hasUpdatedSession.current) {
      return;
    }

    async function updateSession() {
      hasUpdatedSession.current = true;
      await update();
      toast.success("Successfully updated your email!");
      router.replace(
        redirectTo ?? (isPartnerProfile ? "/profile" : "/account/settings"),
      );
    }

    updateSession();
  }, [status, update, isPartnerProfile, redirectTo, router]);

  return (
    <EmptyState
      icon={LoadingSpinner}
      title="Verifying Email Change"
      description="Verifying your email change request. This might take a few seconds..."
    />
  );
}
