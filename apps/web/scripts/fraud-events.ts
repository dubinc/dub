import { createId } from "@/lib/api/create-id";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const i = 3;

  const customer = await prisma.customer.create({
    data: {
      id: createId({ prefix: "cus_" }),
      email: `thomas+${i}@example.com`,
      projectId: "clrei1gld0002vs9mzn93p8ik",
    },
  });

  await prisma.fraudEvent.create({
    data: {
      id: createId({ prefix: "fraud_" }),
      programId: "prog_1K1QC1VPXKT6CP80KTDV6SMBR",
      partnerId: "pn_1K1QE594RDF9MGE3YYXPEVP4H",
      customerId: customer.id,
      linkId: "link_1K1QE5BG9FWQHN2C4BVX33J13",
      selfReferral: true,
      googleAdsClick: true,
      disposableEmail: true,
    },
  });
}

main();
