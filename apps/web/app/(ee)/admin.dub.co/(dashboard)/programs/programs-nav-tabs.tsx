"use client";

import { PageNavTabs } from "@/ui/layout/page-nav-tabs";
import { CrownSmall, GridIcon } from "@dub/ui";
import { useMemo } from "react";

export function ProgramsNavTabs() {
  const tabs = useMemo(
    () => [
      {
        id: "marketplace",
        label: "Marketplace",
        icon: GridIcon,
      },
      {
        id: "sales",
        label: "Top programs by sales",
        icon: CrownSmall,
      },
    ],
    [],
  );

  return <PageNavTabs basePath="/programs" tabs={tabs} />;
}
