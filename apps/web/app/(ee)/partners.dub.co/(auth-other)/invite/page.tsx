"use client";

import { mutatePrefix } from "@/lib/swr/mutate";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { AuthLayout } from "@/ui/layout/auth-layout";
import { Button } from "@dub/ui";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function AcceptPartnerInvitePage() {
  const router = useRouter();
  const { partner, loading } = usePartnerProfile();
  const [accepting, setAccepting] = useState(false);
  const { data: session, update: refreshSession } = useSession();

  const acceptInvite = async () => {
    setAccepting(true);

    try {
      const response = await fetch("/api/partner-profile/invites/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      await refreshSession();
      await mutatePrefix("/api/partner-profile");
      router.replace("/programs");
      toast.success("You are now a member of this partner profile!");
    } catch (error) {
      setAccepting(false);
      toast.error(error.message || "Failed to accept invite.");
    }
  };

  // If user already has a partner profile, redirect to programs
  if (!loading && partner) {
    router.replace("/programs");
    return null;
  }

  if (loading) {
    return (
      <AuthLayout showTerms="partners">
        <div className="flex w-full max-w-sm items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-800" />
            <p className="text-sm text-gray-600">Loading...</p>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout showTerms="partners">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-xl font-semibold">
          Partner Profile Invitation
        </h1>
        <p className="mt-2 text-center text-sm text-gray-500">
          You've been invited to join a partner profile on Dub Partners.
        </p>

        <div className="mt-8">
          <Button
            text="Accept invite"
            onClick={acceptInvite}
            loading={accepting}
            className="w-full"
          />
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          By accepting this invitation, you'll be able to collaborate with other
          members on this partner profile.
        </p>
      </div>
    </AuthLayout>
  );
}
