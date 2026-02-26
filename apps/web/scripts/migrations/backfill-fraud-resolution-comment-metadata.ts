import { parseFraudResolutionComment } from "@/lib/fraud-resolution-comment";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const comments = await prisma.partnerComment.findMany({
    where: {
      metadata: null,
    },
    select: {
      id: true,
      programId: true,
      partnerId: true,
      userId: true,
      text: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  let upgradedFromLegacyEncoded = 0;
  let upgradedFromResolvedGroupMatch = 0;
  let ambiguous = 0;
  let unmatched = 0;

  for (const comment of comments) {
    const legacy = parseFraudResolutionComment(comment.text);

    if (legacy.metadata) {
      if (!dryRun) {
        await prisma.partnerComment.update({
          where: { id: comment.id },
          data: {
            text: legacy.note,
            metadata: {
              source: "fraudResolution",
              groupId: legacy.metadata.groupId,
              type: legacy.metadata.type,
            },
          },
        });
      }

      upgradedFromLegacyEncoded++;
      continue;
    }

    const matchingGroups = await prisma.fraudEventGroup.findMany({
      where: {
        programId: comment.programId,
        partnerId: comment.partnerId,
        userId: comment.userId,
        status: "resolved",
        resolutionReason: comment.text,
      },
      select: {
        id: true,
        type: true,
        resolvedAt: true,
      },
    });

    if (matchingGroups.length === 0) {
      unmatched++;
      continue;
    }

    if (matchingGroups.length > 1) {
      ambiguous++;
      continue;
    }

    const [group] = matchingGroups;

    if (!dryRun) {
      await prisma.partnerComment.update({
        where: { id: comment.id },
        data: {
          metadata: {
            source: "fraudResolution",
            groupId: group.id,
            type: group.type,
          },
        },
      });
    }

    upgradedFromResolvedGroupMatch++;
  }

  console.log(
    [
      `Scanned ${comments.length} comments with null metadata`,
      `Upgraded from legacy encoded comments: ${upgradedFromLegacyEncoded}`,
      `Upgraded from fraud group match: ${upgradedFromResolvedGroupMatch}`,
      `Ambiguous matches skipped: ${ambiguous}`,
      `No matches found: ${unmatched}`,
      `Mode: ${dryRun ? "dry-run" : "write"}`,
    ].join("\n"),
  );
}

main();
