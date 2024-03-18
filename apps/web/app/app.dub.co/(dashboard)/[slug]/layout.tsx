import { ReactNode } from "react";
import WorkspaceAuth from "./auth";

export default function ProjectLayout({ children }: { children: ReactNode }) {
  return <WorkspaceAuth>{children}</WorkspaceAuth>;
}
