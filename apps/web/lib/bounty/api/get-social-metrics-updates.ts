import { getSocialContent } from "@/lib/api/scrape-creators/get-social-content";
import { getPlatformFromSocialUrl } from "@/lib/bounty/social-content";
import { resolveBountyDetails } from "@/lib/bounty/utils";
import { Bounty, BountySubmission, PlatformType } from "@prisma/client";

export type SocialMetricResult = {
  platform: PlatformType;
  url: string;
  metricCount: number | null;
  meetsCriteria: boolean;
};

export type SocialMetricsUpdate = Pick<
  BountySubmission,
  "id" | "socialMetricCount" | "socialMetricsLastSyncedAt"
> & {
  socialMetricResults: SocialMetricResult[];
};

const submissionUrls = (submission: { id: string; urls: unknown }) => {
  const urls =
    Array.isArray(submission.urls) && submission.urls.length > 0
      ? submission.urls.filter(
          (u): u is string => typeof u === "string" && u.trim().length > 0,
        )
      : [];

  return {
    submissionId: submission.id,
    urls,
  };
};

export async function getSocialMetricsUpdates({
  bounty,
  submissions,
}: {
  bounty: Pick<Bounty, "submissionRequirements">;
  submissions: { id: string; urls: unknown } | { id: string; urls: unknown }[];
}): Promise<SocialMetricsUpdate[]> {
  const bountyInfo = resolveBountyDetails(bounty);
  const platforms = bountyInfo?.socialPlatforms ?? [];
  const socialMetrics = bountyInfo?.socialMetrics;

  if (
    !bountyInfo?.hasSocialMetrics ||
    platforms.length === 0 ||
    !socialMetrics
  ) {
    return [];
  }

  const { logic, minCount, metric } = socialMetrics;
  const isAnd = logic === "AND" && platforms.length > 1;

  const list = Array.isArray(submissions) ? submissions : [submissions];
  const toProcess = list.map(submissionUrls).filter((s) => s.urls.length > 0);

  if (toProcess.length === 0) {
    return [];
  }

  // Flatten to one scrape task per (submission, url) pair
  const tasks = toProcess.flatMap(({ submissionId, urls }) =>
    urls
      .map((url) => ({
        submissionId,
        url,
        platform: getPlatformFromSocialUrl(url),
      }))
      .filter(
        (
          task,
        ): task is {
          submissionId: string;
          url: string;
          platform: PlatformType;
        } =>
          task.platform != null &&
          platforms.some((p) => p.value === task.platform),
      ),
  );

  const results: PromiseSettledResult<
    Awaited<ReturnType<typeof getSocialContent>>
  >[] = [];

  for (let i = 0; i < tasks.length; i += 10) {
    const batch = tasks.slice(i, i + 10);
    const batchResults = await Promise.allSettled(
      batch.map((task) =>
        getSocialContent({
          platform: task.platform,
          url: task.url,
        }),
      ),
    );
    results.push(...batchResults);
  }

  const resultsBySubmission = new Map<string, SocialMetricResult[]>();

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const task = tasks[i];

    if (result.status !== "fulfilled") {
      continue;
    }

    const socialContent = result.value;
    const metricValue = socialContent[metric];
    const metricCount =
      typeof metricValue === "number" && Number.isInteger(metricValue)
        ? metricValue
        : null;

    const entry: SocialMetricResult = {
      platform: task.platform,
      url: task.url,
      metricCount,
      meetsCriteria:
        metricCount != null && !!minCount && metricCount >= minCount,
    };

    const existing = resultsBySubmission.get(task.submissionId) ?? [];
    existing.push(entry);
    resultsBySubmission.set(task.submissionId, existing);
  }

  const submissionById = new Map(list.map((s) => [s.id, s]));
  const updates: SocialMetricsUpdate[] = [];

  for (const { submissionId } of toProcess) {
    const submission = submissionById.get(submissionId);
    const socialMetricResults = resultsBySubmission.get(submissionId);

    if (
      !submission ||
      !socialMetricResults ||
      socialMetricResults.length === 0
    ) {
      continue;
    }

    const hasAllRequiredPlatforms = isAnd
      ? platforms.every((p) =>
          socialMetricResults.some((r) => r.platform === p.value),
        )
      : socialMetricResults.length > 0;

    const validCounts = socialMetricResults
      .map((r) => r.metricCount)
      .filter((c): c is number => c != null);

    // Skip incomplete AND scrapes (or any null aggregate) so we don't wipe
    // previously good socialMetricCount / socialMetricResults in the DB.
    if (isAnd) {
      if (
        !hasAllRequiredPlatforms ||
        validCounts.length !== socialMetricResults.length
      ) {
        continue;
      }
    }

    const socialMetricCount = isAnd
      ? Math.min(...validCounts)
      : socialMetricResults[0]?.metricCount ?? null;

    if (socialMetricCount == null) {
      continue;
    }

    updates.push({
      id: submission.id,
      socialMetricCount,
      socialMetricResults,
      socialMetricsLastSyncedAt: new Date(),
    });
  }

  return updates;
}
