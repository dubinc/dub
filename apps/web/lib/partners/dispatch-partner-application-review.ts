import { autoApproveProgramApplicationJob } from "@/lib/jobs/handlers/auto-approve-program-application-job";
import { screenPartnerApplicationJob } from "@/lib/jobs/handlers/screen-partner-application-job";

// Auto-approving groups are screened inside autoApproveProgramApplicationJob, so
// the two jobs never review the same application concurrently.
export function dispatchPartnerApplicationReview({
  applicationId,
  programId,
  partnerId,
  autoApprovePartnersEnabledAt,
  applicationScreeningCriteria,
}: {
  applicationId: string;
  programId: string;
  partnerId: string;
  autoApprovePartnersEnabledAt: Date | null | undefined;
  applicationScreeningCriteria: string | null | undefined;
}) {
  if (autoApprovePartnersEnabledAt) {
    return autoApproveProgramApplicationJob.dispatch(
      {
        applicationId,
      },
      {
        label: partnerId,
      },
    );
  }

  if (applicationScreeningCriteria?.trim()) {
    return screenPartnerApplicationJob.dispatch(
      {
        programId,
        partnerId,
      },
      {
        label: partnerId,
      },
    );
  }

  return Promise.resolve(null);
}
