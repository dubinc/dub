import { createId } from "@/lib/api/create-id";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  await prisma.fraudEvent.createMany({
    data: [
      {
        id: createId({ prefix: "fraud_" }),
        programId: "prog_1K1A7E8620JS2B7CV8TMDW610",
        partnerId: "pn_1K1A7E862WH5HAKGKEYTPVW6V",
        customerId: "cus_1K1AEME4BGNZKGH1HKDMG88BG",
        type: "googleAdsClick",
      },
      {
        id: createId({ prefix: "fraud_" }),
        programId: "prog_1K1A7E8620JS2B7CV8TMDW610",
        partnerId: "pn_1K1A7E862WH5HAKGKEYTPVW6V",
        customerId: "cus_1K1AEME4BGNZKGH1HKDMG88BG",
        type: "disposableEmail",
      },
      {
        id: createId({ prefix: "fraud_" }),
        programId: "prog_1K1A7E8620JS2B7CV8TMDW610",
        partnerId: "pn_1K1A7E862WH5HAKGKEYTPVW6V",
        customerId: "cus_1K1AEME4BGNZKGH1HKDMG88BG",
        type: "selfReferral",
      },
    ],
  });
}

main();
