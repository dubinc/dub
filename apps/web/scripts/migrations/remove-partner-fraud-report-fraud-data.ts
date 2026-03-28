/**
 * One-off: removes FraudRule rows, FraudEventGroup rows, and FraudEvent rows
 * for the retired `partnerFraudReport` rule type.
 *
 * Run **before** deploying the schema that drops `partnerFraudReport` from
 * `FraudRuleType` (so the Prisma client still knows the value), or use the
 * `as any` casts below so it still type-checks after the enum is removed.
 *
 * Usage (from `apps/web`):
 *   pnpm script migrations/remove-partner-fraud-report-fraud-data
 */
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const legacyGroupWhere = { type: "partnerFraudReport" } as any;

  const eventDelete = await prisma.fraudEvent.deleteMany({
    where: {
      fraudEventGroup: legacyGroupWhere,
    },
  });

  console.log(`Deleted ${eventDelete.count} fraud events`);

  const groupDelete = await prisma.fraudEventGroup.deleteMany({
    where: legacyGroupWhere,
  });

  console.log(`Deleted ${groupDelete.count} fraud event groups`);

  const ruleDelete = await prisma.fraudRule.deleteMany({
    where: legacyGroupWhere,
  });

  console.log(`Deleted ${ruleDelete.count} fraud rules`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
