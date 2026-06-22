import { WorkspaceLinksList } from "app/app.dub.co/(dashboard)/[slug]/links/page-client";
import { Suspense } from "react";

export default function AdminLinks() {
  return (
    <Suspense>
      <div className="pb-12 pt-4">
        <WorkspaceLinksList />
      </div>
    </Suspense>
  );
}
