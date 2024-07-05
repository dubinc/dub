import SettingsLayout from "@/ui/layout/settings-layout";
import { Gear2, Key, Receipt2, ShieldCheck, Users6 } from "@dub/ui";
import { ReactNode } from "react";

export default function WorkspaceSettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const tabs = [
    {
      name: "General",
      icon: Gear2,
      segment: null,
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
      name: "API Keys",
      icon: Key,
      segment: "tokens",
    },
    {
      name: "Integrations",
      icon: Gear2,
      segment: "integrations",
    },
    {
      name: "OAuth Apps",
      icon: Key,
      segment: "oauth-apps",
    },
    {
      name: "Security",
      icon: ShieldCheck,
      segment: "security",
    },
  ];

  return (
    <SettingsLayout tabs={tabs} tabContainerClassName="top-[150px]">
      {children}
    </SettingsLayout>
  );
}
