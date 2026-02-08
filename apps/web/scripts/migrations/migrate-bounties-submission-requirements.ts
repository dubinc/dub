import { submissionRequirementsSchema } from "@/lib/zod/schemas/bounties";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { prettyPrint } from "@dub/utils";
import "dotenv-flow/config";

// Standardize domains into links
async function main() {
  const bounties = await prisma.bounty.findMany({
    where: {
      submissionRequirements: {
        not: Prisma.JsonNull,
      },
    },
  });

  for (const bounty of bounties) {
    const submissionRequirements = bounty.submissionRequirements;
    if (Array.isArray(submissionRequirements)) {
      const newSubmissionRequirements = submissionRequirementsSchema.parse({
        ...(submissionRequirements.includes("image")
          ? { image: { max: 4 } }
          : {}),
        ...(submissionRequirements.includes("url") ? { url: { max: 10 } } : {}),
      });
      await prisma.bounty.update({
        where: { id: bounty.id },
        data: { submissionRequirements: newSubmissionRequirements },
      });
      console.log(
        "Updated bounty",
        bounty.id,
        prettyPrint(newSubmissionRequirements),
      );
    }
  }
}

main();
