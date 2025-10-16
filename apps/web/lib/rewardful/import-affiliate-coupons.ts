import { prisma } from "@dub/prisma";
import { bulkCreateLinks } from "../api/links";
import { redis } from "../upstash";
import { RewardfulApi } from "./api";
import { MAX_BATCHES, rewardfulImporter } from "./importer";
import { RewardfulImportPayload } from "./types";

export async function importAffiliateCoupons(payload: RewardfulImportPayload) {
  const { programId, userId, page = 1 } = payload;

  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
  });

  const { token } = await rewardfulImporter.getCredentials(program.workspaceId);

  const rewardfulApi = new RewardfulApi({ token });

  let currentPage = page;
  let hasMore = true;
  let processedBatches = 0;

  while (hasMore && processedBatches < MAX_BATCHES) {
    const affiliateCoupons = await rewardfulApi.listAffiliateCoupons({
      page: currentPage,
    });

    if (affiliateCoupons.length === 0) {
      hasMore = false;
      break;
    }

    const affiliateIds = affiliateCoupons.map(
      (affiliateCoupon) => affiliateCoupon.affiliate_id,
    );

    const results = await redis.hmget<Record<string, string>>(
      `rewardful:affiliates:${program.id}`,
      ...affiliateIds,
    );

    const filteredPartners = Object.fromEntries(
      Object.entries(results ?? {}).filter(
        ([_, value]) => value !== null && value !== undefined,
      ),
    );

    const affiliateIdToCouponsMap = affiliateCoupons.reduce(
      (acc, coupon) => {
        if (!acc[coupon.affiliate_id]) {
          acc[coupon.affiliate_id] = [];
        }

        acc[coupon.affiliate_id].push(coupon);
        return acc;
      },
      {} as Record<string, typeof affiliateCoupons>,
    );

    if (Object.keys(filteredPartners).length > 0) {
      const linksToCreate: any[] = [];

      for (const [affiliateId, partnerId] of Object.entries(filteredPartners)) {
        const coupons = affiliateIdToCouponsMap[affiliateId];

        if (!coupons) {
          continue;
        }

        linksToCreate.push(
          ...coupons.map((coupon) => ({
            domain: program.domain,
            key: coupon.token.toLowerCase(),
            url: program.url,
            trackConversion: true,
            programId,
            partnerId,
            folderId: program.defaultFolderId,
            userId,
            projectId: program.workspaceId,
          })),
        );
      }

      await bulkCreateLinks({
        links: linksToCreate,
      });
    }

    currentPage++;
    processedBatches++;
  }

  if (!hasMore) {
    await redis.del(`rewardful:affiliates:${program.id}`);
  }

  const action = hasMore ? "import-affiliate-coupons" : "import-customers";

  await rewardfulImporter.queue({
    ...payload,
    action,
    page: hasMore ? currentPage : undefined,
  });
}
