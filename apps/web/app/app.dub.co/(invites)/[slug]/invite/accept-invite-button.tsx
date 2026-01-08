"use client";

import { mutatePrefix } from "@/lib/swr/mutate";
import { Button, useKeyboardShortcut } from "@dub/ui";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useState } from "react";
import { toast } from "sonner";

export function AcceptInviteButton() {
  const { slug } = useParams<{ slug: string }>();
  const { data: session } = useSession();
  const router = useRouter();

  const [isAccepting, setIsAccepting] = useState(false);

  const acceptInvite = async () => {
    setIsAccepting(true);

    try {
      const response = await fetch(`/api/workspaces/${slug}/invites/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.message || "Failed to accept invite.");
        setIsAccepting(false);
        return;
      }

      if (session?.user) {
        posthog.identify(session.user["id"], {
          email: session.user.email,
          name: session.user.name,
        });
      }

      posthog.capture("accepted_workspace_invite", {
        workspace: slug,
      });

      await mutatePrefix(["/api/workspaces", "/api/programs"]);
      router.replace(`/${slug}`);
      toast.success("You now are a part of this workspace!");
    } catch (e) {
      console.error("Failed to accept invite", e);
      setIsAccepting(false);
    }
  };

  useKeyboardShortcut("a", acceptInvite, {
    enabled: !isAccepting,
  });

  return (
    <Button
      onClick={acceptInvite}
      loading={isAccepting}
      text="Accept invite"
      shortcut="A"
      className="h-9 rounded-lg [&>div]:flex-initial"
    />
  );
}
