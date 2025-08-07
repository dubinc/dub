import WorkspaceAuth from "app/app.dub.co/(dashboard)/[slug]/auth";
import { ReactNode } from "react";

export default function ProgramEmailLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <WorkspaceAuth>{children}</WorkspaceAuth>;
}
