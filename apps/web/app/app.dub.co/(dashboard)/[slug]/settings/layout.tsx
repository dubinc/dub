import { ReactNode } from "react";
import SettingsLayout from "../../../../../ui/layout/settings-layout";

export default function WorkspaceSettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <SettingsLayout>{children}</SettingsLayout>;
}
