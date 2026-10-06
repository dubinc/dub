import { getSocialContent } from "@/lib/api/scrape-creators/get-social-content";
import { resolveBountyDetails } from "@/lib/bounty/utils";
import { Bounty, BountySubmission } from "@prisma/client";

export type SocialMetricsUpdate = Pick<
  BountySubmission,
  "id" | "socialMetricCount" | "socialMetricsLastSyncedAt"
>;

const submissionWithUrl = (submission: { id: string; urls: unknown }) => {
  const first =
    Array.isArray(submission.urls) && submission.urls.length > 0
      ? submission.urls[0]
      : null;

  const url =
    typeof first === "string" && first.trim().length > 0 ? first.trim() : null;

  return {
    submissionId: submission.id,
    url,
  };
};

type SubmissionToSync = {
  id: string;
  urls: unknown;
  socialMetricCount?: number | null;
};

export async function getSocialMetricsUpdates({
  bounty,
  submissions,
}: {
  bounty: Pick<Bounty, "submissionRequirements">;
  submissions: SubmissionToSync | SubmissionToSync[];
}): Promise<SocialMetricsUpdate[]> {
  const bountyInfo = resolveBountyDetails(bounty);
  const socialPlatform = bountyInfo?.socialPlatform;
  const socialMetrics = bountyInfo?.socialMetrics;

  if (
    !bountyInfo?.hasSocialMetrics ||
    !socialPlatform?.value ||
    !socialMetrics
  ) {
    return [];
  }

  const list = Array.isArray(submissions) ? submissions : [submissions];
  const toProcess = list.map(submissionWithUrl).filter((s) => s.url !== null);

  if (toProcess.length === 0) {
    return [];
  }

  const results = await Promise.allSettled(
    toProcess.map((s) =>
      getSocialContent({
        platform: socialPlatform.value,
        url: s.url!,
      }),
    ),
  );

  const submissionById = new Map(list.map((s) => [s.id, s]));
  const updates: SocialMetricsUpdate[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];

    if (result.status !== "fulfilled") {
      continue;
    }

    const submission = submissionById.get(toProcess[i].submissionId);

    if (!submission) {
      continue;
    }

    const socialContent = result.value;
    const socialMetricCount = socialContent[socialMetrics.metric];

    if (
      socialMetricCount === null ||
      socialMetricCount === undefined ||
      !Number.isInteger(socialMetricCount)
    ) {
      continue;
    }

    // A removed or private post returns 0, so keep the last known count
    if (socialMetricCount === 0 && (submission.socialMetricCount ?? 0) > 0) {
      continue;
    }

    updates.push({
      id: submission.id,
      socialMetricCount,
      socialMetricsLastSyncedAt: new Date(),
    });
  }

  return updates;
}
