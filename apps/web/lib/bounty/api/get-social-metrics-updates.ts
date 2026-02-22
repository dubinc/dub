import { getSocialContent } from "@/lib/api/scrape-creators/get-social-content";
import { resolveBountyDetails } from "@/lib/bounty/utils";
import { Bounty, BountySubmission } from "@dub/prisma/client";

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

export async function getSocialMetricsUpdates({
  bounty,
  submissions,
  skipCache = false,
}: {
  bounty: Pick<Bounty, "submissionRequirements">;
  submissions: { id: string; urls: unknown } | { id: string; urls: unknown }[];
  skipCache?: boolean; // If true, will not use cache and will always fetch from the API
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
        skipCache,
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

    updates.push({
      id: submission.id,
      socialMetricCount,
      socialMetricsLastSyncedAt: new Date(),
    });
  }

  return updates;
}
