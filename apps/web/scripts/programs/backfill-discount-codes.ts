import { ProcessedLinkProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { createId } from "../../lib/api/create-id";
import { bulkCreateLinks } from "../../lib/api/links/bulk-create-links";

const partnerDiscountCodes = {
  "email@example.com": ["EXAMPLE"],
};

const programId = "prog_xxx";
const userId = "user_xxx";

async function main() {
  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
  });

  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      programId: program.id,
      partner: {
        email: {
          in: Object.keys(partnerDiscountCodes),
        },
      },
    },
    select: {
      partner: {
        select: {
          id: true,
          email: true,
        },
      },
      discountId: true,
    },
  });

  const partnerEmailInfo = Object.fromEntries(
    programEnrollments.map((enrollment) => [
      enrollment.partner.email,
      {
        partnerId: enrollment.partner.id,
        discountId: enrollment.discountId,
      },
    ]),
  );
  const partnerIdInfo = Object.fromEntries(
    programEnrollments.map((enrollment) => [
      enrollment.partner.id,
      {
        discountId: enrollment.discountId,
      },
    ]),
  );

  const linksToCreate: Partial<ProcessedLinkProps>[] = [];

  for (const [email, discountCodes] of Object.entries(partnerDiscountCodes)) {
    const { partnerId, discountId } = partnerEmailInfo[email] ?? {};

    if (!partnerId || !discountId) {
      console.log(
        `Skipping ${email} because they don't have a partner ID or discount ID (partnerId: ${partnerId}, discountId: ${discountId})`,
      );
      continue;
    }

    linksToCreate.push(
      ...discountCodes.map((discountCode) => ({
        domain: program.domain!,
        key: discountCode,
        url: program.url!,
        trackConversion: true,
        programId: program.id,
        partnerId,
        folderId: program.defaultFolderId,
        userId,
        projectId: program.workspaceId,
        comments: `Link created for discount code ${discountCode}`,
      })),
    );
  }

  if (linksToCreate.length > 0) {
    const createdLinks = await bulkCreateLinks({
      links: linksToCreate as ProcessedLinkProps[],
    });
    console.log(`Created ${createdLinks.length} links`);

    const createdDiscountCodes = await prisma.discountCode.createMany({
      data: createdLinks
        .map((link) => {
          if (!link.partnerId || !partnerIdInfo[link.partnerId]) {
            return null;
          }
          return {
            id: createId({ prefix: "dcode_" }),
            code: link.key,
            programId: program.id,
            partnerId: link.partnerId,
            linkId: link.id,
            discountId: partnerIdInfo[link.partnerId].discountId,
          };
        })
        .filter((code): code is NonNullable<typeof code> => code !== null),
      skipDuplicates: true,
    });

    console.log(`Created ${createdDiscountCodes.count} discount codes`);
  }
}

main();
