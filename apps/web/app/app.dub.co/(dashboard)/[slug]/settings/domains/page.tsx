import { Suspense } from "react";
import WorkspaceDomainsClient from "./page-client";

export default function WorkspaceDomains() {
  return (
    <Suspense>
      <WorkspaceDomainsClient />
    </Suspense>
  );
}
