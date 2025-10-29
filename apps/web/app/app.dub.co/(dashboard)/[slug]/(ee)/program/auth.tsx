"use client";

import { getPlanCapabilities } from "@/lib/plan-capabilities";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import LayoutLoader from "@/ui/layout/layout-loader";
import { PageContent } from "@/ui/layout/page-content";
import { isLegacyBusinessPlan } from "@dub/utils";
import { ReactNode } from "react";
import { PartnersUpgradeCTA } from "./partners-upgrade-cta";

export default function ProgramAuth({ children }: { children: ReactNode }) {
  const { plan, defaultProgramId, payoutsLimit, loading } = useWorkspace();
  const { loading: programLoading } = useProgram();

  if (loading || (defaultProgramId && programLoading)) {
    return <LayoutLoader />;
  }

  if (
    !defaultProgramId ||
    !getPlanCapabilities(plan).canManageProgram ||
    isLegacyBusinessPlan({ plan, payoutsLimit })
  ) {
    return (
      <PageContent>
        <PartnersUpgradeCTA />
      </PageContent>
    );
  }

  return children;
}
