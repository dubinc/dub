import SettingsLayout from "@/ui/layout/settings-layout";
import { ReactNode } from "react";

export default function WorkspaceSettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <SettingsLayout>{children}</SettingsLayout>;
}
