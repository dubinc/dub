import { ReactNode } from "react";
import WorkspaceSettingsLayoutClient from "./layout-client";

export default function WorkspaceSettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <WorkspaceSettingsLayoutClient>{children}</WorkspaceSettingsLayoutClient>
  );
}
