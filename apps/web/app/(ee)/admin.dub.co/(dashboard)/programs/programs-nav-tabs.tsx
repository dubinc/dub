"use client";

import { PageNavTabs } from "@/ui/layout/page-nav-tabs";
import { CrownSmall, GridIcon, History } from "@dub/ui";
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
        id: "recent",
        label: "Recent programs",
        icon: History,
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
