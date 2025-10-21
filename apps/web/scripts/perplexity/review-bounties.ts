import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

// reject invalid bounty submissions
async function main() {
  const bountySubmissions = await prisma.bountySubmission.findMany({
    where: {
      bountyId: {
        in: [
          "bnty_1K7QH2WJPA1KRGM56VVW911XX",
          "bnty_1K7X45AGSP9PS7TA0F7YAD0M1",
        ],
      },
      status: "submitted",
    },
  });

  const invalidSubmissions = bountySubmissions.filter((submission) => {
    return (submission.urls as string[]).every(
      (url) => !url.includes("linkedin.com"),
    );
  });

  console.log(`Found ${invalidSubmissions.length} invalid bounty submissions`);

  const res = await prisma.bountySubmission.updateMany({
    where: {
      id: {
        in: invalidSubmissions.map((submission) => submission.id),
      },
    },
    data: {
      status: "rejected",
      reviewedAt: new Date(),
      userId: "user_1K1WRVWYV6VDPHF2N6KMRZBNX",
      rejectionReason: "invalidProof",
      rejectionNote: "Not a LinkedIn URL",
      commissionId: null,
    },
  });

  console.log(`Updated ${res.count} bounty submissions`);
}

main();
