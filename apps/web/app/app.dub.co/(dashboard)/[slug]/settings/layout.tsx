import SettingsLayout from "@/ui/layout/settings-layout";
import {
  Gear2,
  Globe,
  Key,
  Receipt2,
  ShieldCheck,
  Tag,
  Users6,
} from "@dub/ui/src/icons";
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
      name: "API Keys",
      icon: Key,
      segment: "tokens",
    },
    {
      name: "Security",
      icon: ShieldCheck,
      segment: "security",
    },
  ];

  return (
    <SettingsLayout tabs={tabs} tabContainerClassName="top-16">
      {children}
    </SettingsLayout>
  );
}
