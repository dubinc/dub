import { WorkspaceLinksList } from "app/app.dub.co/(dashboard)/[slug]/links/page-client";
import { Suspense } from "react";

export default function AdminLinksList() {
  return (
    <Suspense>
      <WorkspaceLinksList />
    </Suspense>
  );
}
