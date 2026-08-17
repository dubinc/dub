import { ReactNode, Suspense } from "react";

export default function PartnersLayout({ children }: { children: ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
