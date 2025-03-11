import { AuditLog } from "./audit-log";
import WorkspaceSecurityClient from "./page-client";

export default function WorkspaceSecurity() {
  return (
    <>
      <WorkspaceSecurityClient />
      <AuditLog />
    </>
  );
}
