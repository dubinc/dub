"use client";

import { PageNavTabs } from "@/ui/layout/page-nav-tabs";
import { GridLayoutRows, ShieldAlert } from "@dub/ui";
import { useMemo } from "react";

export function LinksNavTabs() {
  const tabs = useMemo(
    () => [
      {
        id: "moderation",
        label: "Moderation",
        icon: ShieldAlert,
        href: "/links",
      },
      {
        id: "list",
        label: "Links List",
        icon: GridLayoutRows,
      },
    ],
    [],
  );

  return <PageNavTabs basePath="/links" tabs={tabs} />;
}
