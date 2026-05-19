"use client";

import { PageNavTabs } from "@/ui/layout/page-nav-tabs";
import { AlertCircleFill } from "@/ui/shared/icons";
import { GridIcon, UserCheck } from "@dub/ui";
import { useMemo } from "react";

export function PartnersNavTabs() {
  const tabs = useMemo(
    () => [
      {
        id: "network",
        label: "Network Partners",
        icon: GridIcon,
      },
      {
        id: "trusted",
        label: "Trusted Partners",
        icon: UserCheck,
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
