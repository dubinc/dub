import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/upstash";
import { GOOGLE_ADS_INTEGRATION_ID } from "@dub/utils";

const REDIS_KEY = "googleAdsInstalledWorkspaces";
const TMP_REDIS_KEY = `${REDIS_KEY}:tmp`;

class GoogleAdsInstalledWorkspaces {
  async add(workspaceId: string) {
    return await redis.sadd(REDIS_KEY, workspaceId);
  }

  async remove(workspaceId: string) {
    return await redis.srem(REDIS_KEY, workspaceId);
  }

  async has(workspaceId: string) {
    return await redis.sismember(REDIS_KEY, workspaceId);
  }
}

export const googleAdsInstalledWorkspaces = new GoogleAdsInstalledWorkspaces();

// Rebuild the Redis set of workspaces with Google Ads installed
export const syncGoogleAdsInstalledWorkspaceSet = async () => {
  const installations = await prisma.installedIntegration.findMany({
    where: {
      integrationId: GOOGLE_ADS_INTEGRATION_ID,
      project: {
        plan: {
          in: ["advanced", "enterprise"],
        },
      },
    },
    select: {
      projectId: true,
    },
    distinct: ["projectId"],
  });

  const workspaceIds = installations.map(
    (installation) => installation.projectId,
  );

  if (workspaceIds.length === 0) {
    await redis.del(REDIS_KEY);
    return 0;
  }

  await redis.del(TMP_REDIS_KEY);
  await redis.sadd(TMP_REDIS_KEY, ...(workspaceIds as [string, ...string[]]));
  await redis.rename(TMP_REDIS_KEY, REDIS_KEY);

  return workspaceIds.length;
};
