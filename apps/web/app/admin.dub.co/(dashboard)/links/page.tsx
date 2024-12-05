import AdminLinksClient from "app/app.dub.co/(dashboard)/[slug]/page-client";
import { Suspense } from "react";

export default function AdminLinks() {
  return (
    <Suspense>
      <AdminLinksClient />
    </Suspense>
  );
}
