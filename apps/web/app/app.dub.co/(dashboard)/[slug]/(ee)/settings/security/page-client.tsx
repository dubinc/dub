"use client";

import { AuditLogs } from "./audit-logs";
import { SAML } from "./saml";
import { SCIM } from "./scim";

export default function WorkspaceSecurityClient() {
  return (
    <>
      <SAML />
      <SCIM />
      <AuditLogs />
    </>
  );
}
