import { withdrawPartnerApplicationAction } from "@/lib/actions/partners/withdraw-partner-application";
import { mutatePrefix } from "@/lib/swr/mutate";
import { ProgramEnrollmentProps } from "@/lib/types";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { PartnerStatusBadges } from "@/ui/partners/partner-status-badges";
import { Button, StatusBadge } from "@dub/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";
import { toast } from "sonner";

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
  banned: () => ({
    title: "Program unavailable",
    description: "You have been banned from this program.",
  }),
  rejected: () => ({
    title: "Application rejected",
    description:
      "Your application has been rejected. You can re-apply in 30 days.",
  }),
};

export function UnapprovedProgramPage({
  programEnrollment,
}: {
  programEnrollment: ProgramEnrollmentProps;
}) {
  const router = useRouter();

  const { title, description } = (
    states?.[programEnrollment.status] ?? states.pending
  )(programEnrollment);

  const badge = PartnerStatusBadges[programEnrollment.status];

  const { setShowConfirmModal, confirmModal } = useConfirmModal({
    title: "Withdraw Application",
    description: `Are you sure you want to withdraw your application for ${programEnrollment.program.name}? This will delete your application completely and you'll have to re-apply if you want to join again.`,
    confirmText: "Withdraw application",
    onConfirm: async () => {
      try {
        await withdrawPartnerApplicationAction({
          programId: programEnrollment.programId,
        });
        mutatePrefix("/api/partner-profile/programs");
        router.push("/programs");
        toast.success("Application withdrawn successfully");
      } catch (error) {
        console.error("Error withdrawing application:", error);
        toast.error("Failed to withdraw application. Please try again.");
      }
    },
  });

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
          <p className="text-content-subtle [&_strong]:text-content-default mt-2 max-w-sm text-balance text-sm font-medium [&_strong]:font-semibold">
            {description}{" "}
            {programEnrollment.status === "banned" && (
              <>
                <Link
                  href={`/messages/${programEnrollment.program.slug}`}
                  className="text-neutral-500 underline decoration-dotted underline-offset-2 transition-colors hover:text-neutral-800"
                >
                  Reach out to the {programEnrollment.program.name} team
                </Link>{" "}
                if you have any questions.
              </>
            )}
          </p>

          {/* Withdraw button - only show for pending applications */}
          {programEnrollment.status === "pending" && (
            <div className="mt-6">
              <Button
                variant="secondary"
                text="Withdraw Application"
                onClick={() => setShowConfirmModal(true)}
                className="h-8 px-2.5"
              />
            </div>
          )}
        </div>
      </PageWidthWrapper>

      {confirmModal}
    </PageContent>
  );
}
