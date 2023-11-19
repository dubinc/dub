import { ReactNode } from "react";

export const runtime = "edge";

export default function RedirectsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
