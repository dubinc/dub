"use client";

import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import LayoutLoader from "@/ui/layout/layout-loader";
import { notFound } from "next/navigation";

export function ProgramEnrollmentAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const { error, loading } = useProgramEnrollment();

  if (loading) {
    return <LayoutLoader />;
  }

  if (error && error.status === 404) {
    notFound();
  }
  return children;
}
