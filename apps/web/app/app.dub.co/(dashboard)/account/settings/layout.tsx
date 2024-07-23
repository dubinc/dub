import SettingsLayout from "@/ui/layout/settings-layout";
import { Gear2, Key } from "@dub/ui";
import { ReactNode } from "react";

export default function PersonalSettingsLayout({
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
      name: "API Keys",
      icon: Key,
      segment: "tokens",
    },
  ];

  return (
    <SettingsLayout tabs={tabs} tabContainerClassName="top-[105px]">
      {children}
    </SettingsLayout>
  );
}
