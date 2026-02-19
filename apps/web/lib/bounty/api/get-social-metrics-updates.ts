import { getSocialContent } from "@/lib/api/scrape-creators/get-social-content";
import { getBountyInfo } from "@/lib/bounty/utils";
import { Bounty, BountySubmission } from "@dub/prisma/client";

export type SocialMetricsUpdate = Pick<
  BountySubmission,
  "id" | "socialMetricCount" | "socialMetricsLastSyncedAt"
>;

const submissionWithUrl = (s: { id: string; urls: unknown }) => {
  const url =
    Array.isArray(s.urls) && s.urls.length > 0 ? (s.urls[0] as string) : null;
  return { submissionId: s.id, url };
};

export async function getSocialMetricsUpdates({
  bounty,
  submissions,
  ignoreCache = false,
}: {
  bounty: Pick<Bounty, "submissionRequirements">;
  submissions: { id: string; urls: unknown } | { id: string; urls: unknown }[];
  ignoreCache?: boolean; // If true, will not use cache and will always fetch from the API
}): Promise<SocialMetricsUpdate[]> {
  const bountyInfo = getBountyInfo(bounty);
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
    const rawValue =
      socialContent[socialMetrics.metric as keyof typeof socialContent];

    if (
      rawValue === null ||
      rawValue === undefined ||
      !Number.isInteger(rawValue)
    ) {
      continue;
    }

    const metricValue = rawValue as number;

    updates.push({
      id: submission.id,
      socialMetricCount: metricValue,
      socialMetricsLastSyncedAt: new Date(),
    });
  }

  return updates;
}
