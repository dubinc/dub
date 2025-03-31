import LayoutLoader from "@/ui/layout/layout-loader.tsx";
import { ReactNode, Suspense } from "react";
import { PageTitleProvider } from "./page-context.tsx";

export default async function NewQRLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <PageTitleProvider>{children}</PageTitleProvider>
    </Suspense>
  );
}
