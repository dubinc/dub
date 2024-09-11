import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

async function main() {
  const fakeAffiliates = [
    {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      phoneNumber: "1234567890",
      countryCode: "US",
      linkId: "cm0qj96ys0009wyjecq3cy0f0",
      projectId: "cm0qj8ubt0003wyjecxgfr28m",
    },
    {
      firstName: "Jane",
      lastName: "Doe",
      email: "jane.doe@example.com",
      phoneNumber: "1234567890",
      countryCode: "US",
      linkId: "cm0qj96ys0009wyjecq3cy0f0",
      projectId: "cm0qj8ubt0003wyjecxgfr28m",
    },
  ];

  const affiliates = await prisma.affiliate.createMany({
    data: fakeAffiliates,
  });

  console.log("Affiliates created", affiliates);
}

main();
