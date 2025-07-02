"use client";

import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import LayoutLoader from "@/ui/layout/layout-loader";
import { redirect, useParams, usePathname } from "next/navigation";
import { UnapprovedProgramPage } from "./unapproved-program-page";

export function ProgramEnrollmentAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { programSlug } = useParams();
  const { programEnrollment, error, loading } = useProgramEnrollment();

  if (loading) {
    return <LayoutLoader />;
  }

  if (
    (error && error.status === 404) ||
    (programEnrollment && programEnrollment.status === "invited")
  ) {
    redirect(`/programs/${programSlug}/apply`);
  }

  if (programEnrollment && programEnrollment.status !== "approved") {
    return <UnapprovedProgramPage programEnrollment={programEnrollment} />;
  }

  // Redirect to /links if no links found for a program enrollment
  if (
    programEnrollment &&
    programEnrollment.links?.length === 0 &&
    !pathname.endsWith("/links")
  ) {
    redirect(`/programs/${programSlug}/links`);
  }

  return children;
}
