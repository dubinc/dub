import { ReactNode } from "react";
import SettingsLayout from "#/ui/layout/settings-layout";

export default function ProjectSettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const tabs = [
    {
      name: "General",
      segment: "",
    },
    {
      name: "Billing",
      segment: "/billing",
    },
    {
      name: "People",
      segment: "/people",
    },
    {
      name: "Security",
      segment: "/security",
    },
  ];

  return <SettingsLayout tabs={tabs}>{children}</SettingsLayout>;
}
