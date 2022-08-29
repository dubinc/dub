import { useState } from "react";
import useLocalStorage from "@/lib/use-local-storage";
import VercelEdgeFunctions from "@/components/vercel-edge-functions";
import LinkCard from "@/components/link-card";
import LoadingDots from "@/components/loading-dots";
import PlaceholderCard from "@/components/placeholder-card";
import { SignOutButton, useAuth, UserProfile } from "@clerk/nextjs";

export default function Home() {
  const { isLoaded, userId, sessionId, getToken } = useAuth();

  // Handle these cases in case the user signs out while on the page.
  if (!isLoaded || !userId) {
    return null;
  }

  return (
    <main className="flex items-center justify-center m-12">
      <SignOutButton />
      <UserProfile />
    </main>
  );
}
