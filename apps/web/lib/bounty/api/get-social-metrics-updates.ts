import { getSocialContent } from "@/lib/api/scrape-creators/get-social-content";
import { getBountySocialMetricsRequirements } from "@/lib/bounty/utils";
import { BountySubmission } from "@dub/prisma/client";

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
}: {
  bounty: { submissionRequirements?: unknown };
  submissions: { id: string; urls: unknown } | { id: string; urls: unknown }[];
}): Promise<SocialMetricsUpdate[]> {
  const socialMetrics = getBountySocialMetricsRequirements(bounty);

  if (!socialMetrics) {
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
        platform: socialMetrics.platform,
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
    const metricValue = socialContent[socialMetrics.metric];

    if (metricValue === null || !Number.isInteger(metricValue)) {
      continue;
    }

    updates.push({
      id: submission.id,
      socialMetricCount: metricValue,
      socialMetricsLastSyncedAt: new Date(),
    });
  }

  return updates;
}
