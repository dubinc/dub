import { ExportAuditLog } from "./export-audit-log";
import WorkspaceSecurityClient from "./page-client";

export default function WorkspaceSecurity() {
  return (
    <>
      <WorkspaceSecurityClient />
      <ExportAuditLog />
    </>
  );
}
