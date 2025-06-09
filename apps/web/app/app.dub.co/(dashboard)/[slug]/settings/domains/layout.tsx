import { ReactNode } from "react";
import { DomainsHeader } from "./header";

export default function LibraryLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-4">
      <DomainsHeader />
      {children}
    </div>
  );
}
