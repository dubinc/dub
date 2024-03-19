import { ReactNode } from "react";
import WorkspaceAuth from "./auth";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <WorkspaceAuth>{children}</WorkspaceAuth>;
}
