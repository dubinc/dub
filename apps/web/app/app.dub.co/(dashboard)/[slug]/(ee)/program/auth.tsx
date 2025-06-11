"use client";

import { getPlanCapabilities } from "@/lib/plan-capabilities";
import useWorkspace from "@/lib/swr/use-workspace";
import LayoutLoader from "@/ui/layout/layout-loader";
import { PageContentOld } from "@/ui/layout/page-content";
import { redirect, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { PartnersUpgradeCTA } from "./partners-ugrade-cta";

export default function ProgramAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const {
    slug,
    plan,
    defaultProgramId,
    partnersEnabled,
    loading,
    mutate: mutateWorkspace,
  } = useWorkspace();

  // Whether the workspace has been refreshed or doesn't need to be
  const [isFresh, setIsFresh] = useState(false);

  useEffect(() => {
    if (!defaultProgramId && !isFresh)
      mutateWorkspace().then(() => setIsFresh(true));
    else setIsFresh(true);
  }, [defaultProgramId, mutateWorkspace, isFresh]);

  if (loading || !isFresh) {
    return <LayoutLoader />;
  }

  if (!defaultProgramId && partnersEnabled) redirect(`/${slug}/program/new`);

  if (!getPlanCapabilities(plan).canManageProgram) {
    return (
      <PageContentOld>
        <PartnersUpgradeCTA />
      </PageContentOld>
    );
  }

  return children;
}
