"use client";

import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import LayoutLoader from "@/ui/layout/layout-loader";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

export default function CampaignsLayout({ children }: { children: ReactNode }) {
  const { slug } = useWorkspace();
  const { program, loading } = useProgram();

  if (loading) return <LayoutLoader />;

  if (!program?.campaignsEnabledAt) redirect(`/${slug}/program`);

  return children;
}
