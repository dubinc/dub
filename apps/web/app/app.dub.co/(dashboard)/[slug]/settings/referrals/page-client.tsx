"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import Referrals from "@/ui/workspaces/referrals";
import { useRouter } from "next/navigation";
import { Suspense } from "react";

export default function WorkspaceReferralsClient() {
  const router = useRouter();
  const { id, name, slug, isOwner, betaTester } = useWorkspace();

  return (
    <>
      {betaTester && (
        <Suspense>
          <Referrals />
        </Suspense>
      )}
    </>
  );
}
