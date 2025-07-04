"use client";

import { AuditLog } from "./audit-log";
import { SAML } from "./saml";
import { SCIM } from "./scim";

export default function WorkspaceSecurityClient() {
  return (
    <>
      <SAML />
      <SCIM />
      <AuditLog />
    </>
  );
}
