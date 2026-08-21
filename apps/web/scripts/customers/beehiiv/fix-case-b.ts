import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";
import { bulkCreateLinks } from "../../../lib/api/links/bulk-create-links";

// case B: sales come from link only (https://dub.slack.com/archives/C08S54HTHA8/p1782854750091729?thread_ts=1782830134.684169&cid=C08S54HTHA8)
// super simple, just create a new -coupon link for the discount code and assign it to the correct partner
async function main() {
  const PROGRAM_ID = "prog_xxx";

  const discountCodes = await prisma.discountCode.findMany({
    where: {
      programId: PROGRAM_ID,
      linkId: "link_xxx",
    },
    include: {
      link: {
        include: {
          partner: true,
        },
      },
      partner: true,
    },
  });
  if (discountCodes.length === 0) {
    console.log("No discount codes found");
    return;
  }
  console.log(`Found ${discountCodes.length} discount codes`);

  const discountCodesToReassign = discountCodes.filter(
    (discountCode) => discountCode.partnerId !== discountCode.link?.partnerId,
  );

  console.table(
    discountCodesToReassign.map((discountCode) => ({
      id: discountCode.id,
      partnerId: discountCode.partnerId,
      linkPartnerId: discountCode.link?.partnerId,
      partnerName: discountCode.partner?.name,
      linkPartnerName: discountCode.link?.partner?.name,
      saleAmount: discountCode.link?.saleAmount,
    })),
  );

  const linksToCreate = discountCodesToReassign.map((discountCode) => ({
    domain: discountCode.link?.domain!,
    key: `${discountCode.code}-coupon`,
    url: discountCode.link?.url!,
    trackConversion: true,
    programId: discountCode.programId,
    partnerId: discountCode.partnerId,
    folderId: discountCode.link?.folderId,
    userId: discountCode.link?.userId,
    projectId: discountCode.link?.projectId,
    comments: `Link created for Rewardful coupon "${discountCode.code}"`,
  }));

  console.table(linksToCreate);

  const createdLinks = await bulkCreateLinks({
    links: linksToCreate,
    skipRedisCache: true,
  });
  console.log(`Created ${createdLinks.length} links`);

  for (const newLink of createdLinks) {
    const updatedDiscountCode = await prisma.discountCode.update({
      where: {
        programId_code: {
          programId: PROGRAM_ID,
          code: newLink.key.replace("-coupon", ""),
        },
      },
      data: {
        linkId: newLink.id,
      },
    });
    console.log(
      `Updated discount code ${updatedDiscountCode.code} to map to link ${newLink.shortLink}`,
    );
  }
}

main();
