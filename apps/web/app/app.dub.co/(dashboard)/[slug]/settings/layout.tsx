import { getFeatureFlags } from "@/lib/edge-config";
import SettingsLayout from "@/ui/layout/settings-layout";
import {
  CircleInfo,
  ConnectedDots,
  CubeSettings,
  Gear2,
  Globe,
  Key,
  Receipt2,
  ShieldCheck,
  Tag,
  Users6,
} from "@dub/ui/src/icons";
// import { Webhook } from "lucide-react";
import { ReactNode } from "react";

export default async function WorkspaceSettingsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { slug: string };
}) {
  const flags = await getFeatureFlags({ workspaceSlug: params.slug });

  const tabs = [
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
        ...(flags.integrations
          ? [
              {
                name: "Integrations",
                icon: ConnectedDots,
                segment: "integrations",
              },
            ]
          : []),
        {
          name: "Security",
          icon: ShieldCheck,
          segment: "security",
        },
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
        ...(flags.webhooks
          ? [{ name: "Webhooks", icon: Key, segment: "webhooks" }]
          : []),
        ...(flags.integrations
          ? [{ name: "OAuth Apps", icon: CubeSettings, segment: "oauth-apps" }]
          : []),
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
  ];

  return (
    <SettingsLayout tabs={tabs} tabContainerClassName="top-16">
      {children}
    </SettingsLayout>
  );
}
