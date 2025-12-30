import { prisma } from "@dub/prisma";
import { bulkCreateLinks } from "../api/links";
import { ProcessedLinkProps } from "../types";
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
    select: {
      id: true,
      workspaceId: true,
      domain: true,
      url: true,
      defaultFolderId: true,
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

    // Find the coupons that have a partner account created on Dub
    const filteredCoupons = affiliateCoupons.filter(
      (affiliateCoupon) => filteredPartners[affiliateCoupon.affiliate_id],
    );

    const affiliateIdToCouponsMap = filteredCoupons.reduce(
      (acc, coupon) => {
        if (!acc[coupon.affiliate_id]) {
          acc[coupon.affiliate_id] = [];
        }

        acc[coupon.affiliate_id].push(coupon);
        return acc;
      },

      {} as Record<string, typeof filteredCoupons>,
    );

    const linksToCreate: Partial<ProcessedLinkProps>[] = [];

    if (Object.keys(affiliateIdToCouponsMap).length > 0) {
      for (const [affiliateId, coupons] of Object.entries(
        affiliateIdToCouponsMap,
      )) {
        const partnerId = filteredPartners[affiliateId];

        if (!partnerId) {
          continue;
        }

        linksToCreate.push(
          ...coupons.map((coupon) => ({
            domain: program.domain!,
            key: coupon.token,
            url: program.url!,
            trackConversion: true,
            programId,
            partnerId,
            folderId: program.defaultFolderId,
            userId,
            projectId: program.workspaceId,
            comments: `Link created for coupon ${coupon.token}`,
          })),
        );
      }
    }

    if (linksToCreate.length > 0) {
      await bulkCreateLinks({
        links: linksToCreate as ProcessedLinkProps[],
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
