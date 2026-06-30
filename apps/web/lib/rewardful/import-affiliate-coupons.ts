import { prisma } from "@/lib/prisma";
import { nanoid } from "@dub/utils";
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
    const filteredCoupons = affiliateCoupons.filter(
      (affiliateCoupon) => filteredPartners[affiliateCoupon.affiliate_id],
    );

    const existingDiscountCodes = await prisma.discountCode.findMany({
      where: {
        programId,
        code: {
          in: filteredCoupons.map((coupon) => coupon.token),
        },
      },
      select: {
        code: true,
      },
    });

    const existingDiscountCodeSet = new Set(
      existingDiscountCodes.map((discountCode) =>
        discountCode.code.toLowerCase(),
      ),
    );

    const couponsToImport = filteredCoupons.filter(
      (coupon) => !existingDiscountCodeSet.has(coupon.token.toLowerCase()),
    );

    // A coupon's link MUST be owned by the coupon's partner. But affiliate link
    // tokens (created in import-partners) and coupon tokens share the same
    // Link.key namespace (unique per domain), so a coupon token can collide with
    // a link that already belongs to a *different* partner. Reusing that link
    // would attribute the coupon's sales to the wrong partner (the link owner),
    // so we detect collisions and create a fresh, uniquely-keyed link owned by
    // the coupon's partner instead.
    const existingLinks =
      couponsToImport.length > 0
        ? await prisma.link.findMany({
            where: {
              domain: program.domain!,
              key: {
                in: couponsToImport.map((coupon) => coupon.token),
              },
            },
            select: {
              key: true,
            },
          })
        : [];

    const takenKeys = new Set(
      existingLinks.map((link) => link.key.toLowerCase()),
    );

    // map each coupon token to the (possibly fallback) key assigned to its link
    const couponTokenToLinkKey = new Map<string, string>();
    const linksToCreate: Partial<ProcessedLinkProps>[] = [];

    for (const coupon of couponsToImport) {
      const { partnerId } = filteredPartners[coupon.affiliate_id];

      if (!partnerId) {
        continue;
      }

      // Use the coupon token as the link key when it's free; otherwise fall back
      // to a unique key so the link stays owned by this coupon's partner.
      const key = takenKeys.has(coupon.token.toLowerCase())
        ? `${coupon.token}-${nanoid(6)}`
        : coupon.token;

      takenKeys.add(key.toLowerCase());
      couponTokenToLinkKey.set(coupon.token, key);

      linksToCreate.push({
        domain: program.domain!,
        key,
        url: program.url!,
        trackConversion: true,
        programId,
        partnerId,
        folderId: program.defaultFolderId,
        userId,
        projectId: program.workspaceId,
        comments: `Link created for coupon ${coupon.token}`,
      });
    }

    if (linksToCreate.length > 0) {
      const createdLinks = await bulkCreateLinks({
        links: linksToCreate as ProcessedLinkProps[],
      });
      console.log(`Created ${createdLinks.length} links`);

      // index created links by their (case-insensitive) key for robust lookup
      const linkByKey = new Map(
        createdLinks.map((link) => [link.key.toLowerCase(), link]),
      );

      const createdDiscountCodes = await prisma.discountCode.createMany({
        data: couponsToImport
          .map((coupon) => {
            const { partnerId, discountId } =
              filteredPartners[coupon.affiliate_id];

            const assignedKey = couponTokenToLinkKey.get(coupon.token);
            const link = assignedKey
              ? linkByKey.get(assignedKey.toLowerCase())
              : undefined;

            if (!link) {
              console.error(`Link not found for coupon ${coupon.token}`);
              return null;
            }

            // Safety net: never bind a discount code to a link owned by a different partner
            if (link.partnerId !== partnerId) {
              console.error(
                `Skipping coupon ${coupon.token}: resolved link ${link.id} is owned by ${link.partnerId}, expected ${partnerId}`,
              );
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
