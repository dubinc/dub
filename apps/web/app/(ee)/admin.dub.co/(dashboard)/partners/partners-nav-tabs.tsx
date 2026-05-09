"use client";

import { PageNavTabs } from "@/ui/layout/page-nav-tabs";
import { AlertCircleFill } from "@/ui/shared/icons";
import { GridIcon, UserCheck } from "@dub/ui";
import { useMemo } from "react";

export function PartnersNavTabs() {
  const tabs = useMemo(
    () => [
      {
        id: "trusted",
        label: "Trusted Partners",
        icon: UserCheck,
      },
      {
        id: "network",
        label: "Network Applications",
        icon: GridIcon,
      },
      {
        id: "fraud",
        label: "Fraud Alerts",
        icon: AlertCircleFill,
      },
    ],
    [],
  );

  return <PageNavTabs basePath="/partners" tabs={tabs} />;
}
