"use client";

import { EventType } from "@/lib/analytics/types";
import useWorkspace from "@/lib/swr/use-workspace";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Referrals } from "./referrals";

// TODO:
// event and page should be part of iframe
interface ReferralsPageClientProps {
  event: EventType | undefined;
  page: string | undefined;
}

export default function ReferralsPageClient({
  event,
  page,
}: ReferralsPageClientProps) {
  const { slug, flags } = useWorkspace();
  const [publicToken, setPublicToken] = useState<string | null>(null);

  // Get publicToken from server when component mounts
  const createPublicToken = async () => {
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
  };

  useEffect(() => {
    createPublicToken();
  }, []);

  if (!flags?.referrals) {
    redirect(`/${slug}/settings`);
  }

  if (!publicToken) {
    return null;
  }

  return (
    <>
      <Referrals
        slug={slug!}
        event={event}
        page={page}
        publicToken={publicToken}
      />
    </>
  );
}
