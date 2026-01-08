"use client";

import { AuditLogs } from "./audit-logs";
import { SAML } from "./saml";
import { SCIM } from "./scim";

export default function WorkspaceSecurityClient() {
  return (
    <div className="flex flex-col gap-6">
      <SAML />
      <SCIM />
      <AuditLogs />
    </div>
  );
}
