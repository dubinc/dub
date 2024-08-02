import { Suspense } from "react";
import WorkspaceTagsClient from "./page-client";

export default function WorkspaceDomains() {
  return (
    <Suspense>
      <WorkspaceTagsClient />
    </Suspense>
  );
}
