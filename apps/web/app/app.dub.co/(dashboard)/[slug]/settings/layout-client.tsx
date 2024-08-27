"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import SettingsLayout from "@/ui/layout/settings-layout";
import {
  CircleInfo,
  ConnectedDots,
  CubeSettings,
  Gear2,
  Gift,
  Globe,
  Key,
  Receipt2,
  ShieldCheck,
  Tag,
  Users6,
} from "@dub/ui/src/icons";
import { ReactNode, useMemo } from "react";

export default function WorkspaceSettingsLayoutClient({
  children,
}: {
  children: ReactNode;
}) {
  const { flags } = useWorkspace();

  const tabs = useMemo(
    () => [
      // Workspace Settings
      {
        group: "Workspace Settings",
        tabs: [
          {
            name: "General",
            icon: Gear2,
            segment: null,
          },
          {
            name: "Domains",
            icon: Globe,
            segment: "domains",
          },
          {
            name: "Tags",
            icon: Tag,
            segment: "tags",
          },
          {
            name: "Billing",
            icon: Receipt2,
            segment: "billing",
          },
          {
            name: "People",
            icon: Users6,
            segment: "people",
          },
          {
            name: "Integrations",
            icon: ConnectedDots,
            segment: "integrations",
          },
          {
            name: "Security",
            icon: ShieldCheck,
            segment: "security",
          },
          ...(flags?.referrals
            ? [{ name: "Referrals", icon: Gift, segment: "referrals" }]
            : []),
        ],
      },

      // Developer Settings
      {
        group: "Developer Settings",
        tabs: [
          {
            name: "API Keys",
            icon: Key,
            segment: "tokens",
          },
          {
            name: "OAuth Apps",
            icon: CubeSettings,
            segment: "oauth-apps",
          },
        ],
      },

      // Account Settings
      {
        group: "Account Settings",
        tabs: [
          {
            name: "Notifications",
            icon: CircleInfo,
            segment: "notifications",
          },
        ],
      },
    ],
    [flags],
  );

  return (
    <SettingsLayout tabs={tabs} tabContainerClassName="top-16">
      {children}
    </SettingsLayout>
  );
}
