"use client";

import { PageNavTabs } from "@/ui/layout/page-nav-tabs";
import { GridIcon, Users } from "@dub/ui";

export function CommissionsNav() {
  return (
    <PageNavTabs
      basePath="/commissions"
      tabs={[
        {
          id: "programs",
          label: "Programs",
          icon: GridIcon,
          href: "/commissions",
        },
        {
          id: "partners",
          label: "Partners",
          icon: Users,
        },
      ]}
      preservedQueryParams={[
        "interval",
        "start",
        "end",
        "programId",
        "partnerId",
      ]}
    />
  );
}
