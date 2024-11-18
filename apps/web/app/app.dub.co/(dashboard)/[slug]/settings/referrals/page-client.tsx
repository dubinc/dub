"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { ReferralsEmbed } from "@/ui/embed/referrals-embed";
import { redirect } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function ReferralsPageClient() {
  const { slug, flags } = useWorkspace();
  const [publicToken, setPublicToken] = useState<string | null>(null);

  // Get publicToken from server when component mounts
  const createPublicToken = useCallback(async () => {
    const response = await fetch(`/api/workspaces/${slug}/referrals-token`, {
      method: "POST",
    });

    if (!response.ok) {
      throw toast.error("Failed to create public token");
    }

    const { publicToken } = (await response.json()) as {
      publicToken: string;
    };

    setPublicToken(publicToken);
  }, [slug]);

  useEffect(() => {
    createPublicToken();
  }, []);

  if (!flags?.referrals) {
    redirect(`/${slug}/settings`);
  }

  if (!publicToken) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <ReferralsEmbed publicToken={publicToken} />
    </>
  );
}
