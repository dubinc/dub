import { ProgramEnrollmentProps } from "@/lib/types";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { PartnerStatusBadges } from "@/ui/partners/partner-status-badges";
import { StatusBadge } from "@dub/ui";
import { ReactNode } from "react";

const states: Record<
  string,
  (programEnrollment: ProgramEnrollmentProps) => {
    title: string;
    description: ReactNode;
  }
> = {
  pending: (programEnrollment) => ({
    title: "Application in review",
    description: (
      <>
        You'll be notified by email when{" "}
        <strong>{programEnrollment.program.name}</strong> has finished reviewing
        your application.
      </>
    ),
  }),
  rejected: () => ({
    title: "Application reviewed",
    description: "Your application has been rejected.",
  }),
  banned: () => ({
    title: "Program unavailable",
    description: "You have been banned from this program.",
  }),
};

export function UnapprovedProgramPage({
  programEnrollment,
}: {
  programEnrollment: ProgramEnrollmentProps;
}) {
  const { title, description } = (
    states?.[programEnrollment.status] ?? states.pending
  )(programEnrollment);

  const badge = PartnerStatusBadges[programEnrollment.status];

  return (
    <PageContent title="Application">
      <PageWidthWrapper>
        <div className="flex min-h-[calc(100vh-10rem)] flex-col items-center justify-center py-10 text-center">
          <StatusBadge
            variant={badge.variant}
            icon={badge.icon}
            className="px-1.5 py-0.5"
          >
            {badge.label}
          </StatusBadge>
          <h2 className="text-content-default mt-4 text-base font-semibold">
            {title}
          </h2>
          <p className="text-content-subtle [&_strong]:text-content-default mt-2 max-w-sm text-sm font-medium [&_strong]:font-semibold">
            {description}
          </p>
        </div>
      </PageWidthWrapper>
    </PageContent>
  );
}
