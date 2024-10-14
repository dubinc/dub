"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import LayoutLoader from "@/ui/layout/layout-loader";
import { notFound } from "next/navigation";
import { ReactNode } from "react";

export default function WorkspaceAuth({ children }: { children: ReactNode }) {
  const { loading, error } = useWorkspace();

  if (loading) {
    return <LayoutLoader />;
  }

  if (error && error.status === 404) {
    notFound();
  }

  return children;
}
