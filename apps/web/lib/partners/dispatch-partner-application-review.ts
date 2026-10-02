import { autoApprovePartnerJob } from "@/lib/jobs/handlers/auto-approve-partner-job";
import { screenPartnerApplicationJob } from "@/lib/jobs/handlers/screen-partner-application-job";

// Auto-approving groups are screened inside autoApprovePartnerJob, so the two
// jobs never review the same enrollment concurrently.
export function dispatchPartnerApplicationReview({
  programId,
  partnerId,
  autoApprovePartnersEnabledAt,
  applicationScreeningCriteria,
}: {
  programId: string;
  partnerId: string;
  autoApprovePartnersEnabledAt: Date | null | undefined;
  applicationScreeningCriteria: string | null | undefined;
}) {
  if (autoApprovePartnersEnabledAt) {
    return autoApprovePartnerJob.dispatch(
      {
        programId,
        partnerId,
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
