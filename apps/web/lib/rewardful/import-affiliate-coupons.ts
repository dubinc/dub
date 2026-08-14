import { prisma } from "@/lib/prisma";
import { createId } from "../api/create-id";
import { bulkCreateLinks } from "../api/links";
import { ProcessedLinkProps } from "../types";
import { redis } from "../upstash";
import { RewardfulApi } from "./api";
import { REWARDFUL_MAX_BATCHES, rewardfulImporter } from "./importer";
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

  while (hasMore && processedBatches < REWARDFUL_MAX_BATCHES) {
    const allAffiliateCoupons = await rewardfulApi.listAffiliateCoupons({
      page: currentPage,
    });

    if (allAffiliateCoupons.length === 0) {
      hasMore = false;
      break;
    }

    const activeAffiliateCoupons = allAffiliateCoupons.filter(
      (affiliateCoupon) => !affiliateCoupon.archived,
    );

    if (activeAffiliateCoupons.length === 0) {
      currentPage++;
      processedBatches++;
      continue;
    }

    const affiliateIds = activeAffiliateCoupons.map(
      (affiliateCoupon) => affiliateCoupon.affiliate_id,
    );

    const results = await redis.hmget<
      Record<
        string,
        { partnerId: string; groupId: string | null; discountId: string | null }
      >
    >(`rewardful:affiliates:${program.id}`, ...affiliateIds);

    const filteredPartners = Object.fromEntries(
      Object.entries(results ?? {}).filter(
        ([_, value]) => value !== null && value !== undefined,
      ),
    );

    // Find the coupons that have a partner account created on Dub
    const filteredCoupons = activeAffiliateCoupons.filter(
      (affiliateCoupon) => filteredPartners[affiliateCoupon.affiliate_id],
    );

    const existingDiscountCodes = await prisma.discountCode.findMany({
      where: {
        programId,
        code: {
          in: filteredCoupons.map((coupon) => coupon.token),
        },
      },
    });

    const couponCodesToImport = filteredCoupons.filter(
      (coupon) => !existingDiscountCodes.some((dc) => dc.code === coupon.token),
    );

    const affiliateIdToCouponsMap = couponCodesToImport.reduce(
      (acc, coupon) => {
        if (!acc[coupon.affiliate_id]) {
          acc[coupon.affiliate_id] = [];
        }

        acc[coupon.affiliate_id].push(coupon);
        return acc;
      },

      {} as Record<string, typeof couponCodesToImport>,
    );

    const linksToCreate: Partial<ProcessedLinkProps>[] = [];

    if (Object.keys(affiliateIdToCouponsMap).length > 0) {
      for (const [affiliateId, coupons] of Object.entries(
        affiliateIdToCouponsMap,
      )) {
        const { partnerId } = filteredPartners[affiliateId];

        if (!partnerId) {
          continue;
        }

        linksToCreate.push(
          ...coupons.map((coupon) => ({
            domain: program.domain!,
            key: `${coupon.token}-coupon`,
            url: program.url!,
            trackConversion: true,
            programId,
            partnerId,
            folderId: program.defaultFolderId,
            userId,
            projectId: program.workspaceId,
            comments: `Link created for Rewardful coupon "${coupon.token}"`,
          })),
        );
      }
    }

    if (linksToCreate.length > 0) {
      const createdLinks = await bulkCreateLinks({
        links: linksToCreate as ProcessedLinkProps[],
      });
      console.log(`Created ${createdLinks.length} links`);

      const createdDiscountCodes = await prisma.discountCode.createMany({
        data: couponCodesToImport
          .map((coupon) => {
            const { partnerId, discountId } =
              filteredPartners[coupon.affiliate_id];

            // link should always exist since we return all links (including duplicates) from bulkCreateLinks
            // need to remove "-coupon" from the key to match the coupon token
            const link = createdLinks.find(
              (link) =>
                link.key.toLowerCase().replace("-coupon", "") ===
                coupon.token.toLowerCase(),
            );
            if (!link) {
              console.error(`Link not found for coupon ${coupon.token}`);
              return null;
            }

            return {
              id: createId({ prefix: "dcode_" }),
              code: coupon.token,
              programId,
              partnerId,
              linkId: link.id,
              discountId,
            };
          })
          .filter((code): code is NonNullable<typeof code> => code !== null),
        skipDuplicates: true,
      });

      console.log(`Created ${createdDiscountCodes.count} discount codes`);
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
