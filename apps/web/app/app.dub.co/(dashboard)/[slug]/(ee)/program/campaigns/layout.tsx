"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import LayoutLoader from "@/ui/layout/layout-loader";
import { ReactNode } from "react";

export default function CampaignsLayout({ children }: { children: ReactNode }) {
  const { slug, flags, loading } = useWorkspace();

  if (loading) return <LayoutLoader />;

  return children;
}
