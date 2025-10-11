"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import LayoutLoader from "@/ui/layout/layout-loader";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

export default function CampaignsLayout({ children }: { children: ReactNode }) {
  const { slug, flags, loading } = useWorkspace();

  if (loading) return <LayoutLoader />;

  if (!flags?.emailCampaigns) redirect(`/${slug}/program`);

  return children;
}
