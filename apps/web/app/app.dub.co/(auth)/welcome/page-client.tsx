"use client";

import { useAddWorkspaceModal } from "@/ui/modals/add-workspace-modal";
import Intro from "@/ui/welcome/intro";
import { trackEvent } from "fathom-client";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePlausible } from "next-plausible";
import { useRouter, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { useEffect } from "react";

export default function WelcomePageClient() {
  const plausible = usePlausible();

  const { setShowAddWorkspaceModal, AddWorkspaceModal } =
    useAddWorkspaceModal();

  const router = useRouter();
  const searchParams = useSearchParams();

  const { data: session } = useSession();

  useEffect(() => {
    trackEvent("Signed Up");
    plausible("Signed Up");
    if (session?.user) {
      posthog.identify(session.user["id"], {
        email: session.user.email,
        name: session.user.name,
      });
      posthog.capture("user_signed_up");
    }
  }, [session?.user]);

  useEffect(() => {
    if (searchParams.get("step") === "workspace") {
      setTimeout(() => {
        setShowAddWorkspaceModal(true);
      }, 200);
    } else {
      setShowAddWorkspaceModal(false);
    }
  }, [searchParams.get("step")]);

  return (
    <div className="flex h-screen flex-col items-center">
      <AddWorkspaceModal />
      <AnimatePresence mode="wait">
        {!searchParams.get("step") ? (
          <Intro />
        ) : (
          <>
            <button
              className="group fixed left-10 top-10 isolate z-[99] rounded-full p-2 transition-all hover:bg-gray-100"
              onClick={() => router.back()}
            >
              <ArrowLeft
                size={20}
                className="text-gray-500 group-hover:text-gray-700 group-active:scale-90"
              />
            </button>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
