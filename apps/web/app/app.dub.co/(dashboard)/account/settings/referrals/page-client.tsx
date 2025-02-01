"use client";

import LayoutLoader from "@/ui/layout/layout-loader";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { DubEmbed } from "@dub/embed-react";
import { CursorRays, Hyperlink, InvoiceDollar, UserCheck } from "@dub/ui/icons";
import { fetcher } from "@dub/utils";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import useSWRImmutable from "swr/immutable";

export function ReferralsPageClient() {
  const { data: session, status, update } = useSession();
  const dubPartnerId = session?.user?.["dubPartnerId"];

  useEffect(() => {
    if (session && !dubPartnerId) {
      console.log("no dubPartnerId found, updating session...");
      update();
    }
  }, [session, dubPartnerId]);

  const { data: { publicToken } = {}, isLoading } = useSWRImmutable<{
    publicToken: string;
  }>(dubPartnerId && "/api/user/embed-tokens", fetcher, {
    keepPreviousData: true,
  });

  if (status === "loading" || isLoading) {
    return <LayoutLoader />;
  }

  if (!dubPartnerId || !publicToken) {
    return (
      <AnimatedEmptyState
        title="Refer a friend"
        description="Activate your referral link to share the word about Dub and earn cash rewards"
        cardContent={
          <>
            <Hyperlink className="size-4 text-neutral-700" />
            <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
            <div className="xs:flex hidden grow items-center justify-end gap-1.5 text-gray-500">
              <CursorRays className="size-3.5" />
              <UserCheck className="size-3.5" />
              <InvoiceDollar className="size-3.5" />
            </div>
          </>
        }
        pillContent="Coming soon"
      />
    );
  }

  return <DubEmbed token={publicToken} />;
}
