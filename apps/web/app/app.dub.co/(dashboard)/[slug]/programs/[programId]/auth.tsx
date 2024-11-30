"use client";

import useProgram from "@/lib/swr/use-program";
import LayoutLoader from "@/ui/layout/layout-loader";
import { redirect, useParams } from "next/navigation";
import { ReactNode } from "react";

export default function ProgramAuth({ children }: { children: ReactNode }) {
  const { slug } = useParams();
  const { loading, error } = useProgram();

  if (loading) {
    return <LayoutLoader />;
  }

  if (error && error.status === 404) {
    redirect(`/${slug}`);
  }

  return children;
}
