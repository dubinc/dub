import { ReactNode } from "react";
import WorkspaceAuth from "./auth";
import { InviteRedirect } from "./invite-redirect";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <WorkspaceAuth>{children}</WorkspaceAuth>
      <InviteRedirect />
    </>
  );
}
