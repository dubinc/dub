import SettingsLayout from "@/ui/layout/settings-layout";
import { ReactNode } from "react";

export default function WorkspaceSettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const tabs = [
    {
      name: "General",
      segment: null,
    },
    {
      name: "Billing",
      segment: "billing",
    },
    {
      name: "People",
      segment: "people",
    },
    {
      name: "API Keys",
      segment: "tokens",
    },
    {
      name: "Security",
      segment: "security",
    },
  ];

  return <SettingsLayout tabs={tabs}>{children}</SettingsLayout>;
}
