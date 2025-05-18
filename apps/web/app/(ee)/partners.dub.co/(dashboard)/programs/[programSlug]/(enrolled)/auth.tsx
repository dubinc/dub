"use client";

import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import LayoutLoader from "@/ui/layout/layout-loader";
import { redirect, useParams } from "next/navigation";

export function ProgramEnrollmentAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const { programSlug } = useParams();
  const { programEnrollment, error, loading } = useProgramEnrollment();

  if (loading) {
    return <LayoutLoader />;
  }

  if (
    (error && error.status === 404) ||
    (programEnrollment && programEnrollment.status !== "approved")
  ) {
    redirect(`/programs/${programSlug}/apply`);
  }

  return children;
}
