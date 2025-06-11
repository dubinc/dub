import SettingsLayout from "@/ui/layout/settings-layout";
import { ReactNode } from "react";

// TODO: Move remaining (basic-layout) pages out and get them using PageContent instead
export default function WorkspaceSettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <SettingsLayout>{children}</SettingsLayout>;
}
