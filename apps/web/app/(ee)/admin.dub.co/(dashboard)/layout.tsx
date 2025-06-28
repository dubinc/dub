import { constructMetadata } from "@dub/utils";
import { ReactNode } from "react";
import { AdminNav } from "./layout-nav-client";

export const metadata = constructMetadata({ noIndex: true });

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="min-h-screen w-full bg-neutral-50">
        <AdminNav />
        {children}
      </div>
    </>
  );
}
