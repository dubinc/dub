import { ReactNode } from "react";
import LibraryHeader from "./header";

export default function LibraryLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-4">
      <LibraryHeader />
      {children}
    </div>
  );
}
