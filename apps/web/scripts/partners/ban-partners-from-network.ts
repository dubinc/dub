/**
 * Bans fradulent partners from the Dub Partner Network and
 * confirms an admin fraud alert for each one.
 *
 * Partners already banned from the network are skipped. Nothing is written
 * for them, including a new fraud alert.
 *
 * The fraud alert reason is FRAUD_ALERT_MESSAGE below. Override it with
 * --message or --message-file. --execute also needs --reviewed-by, a Dub
 * admin user id (user_...) or email, stored as the alert reviewer.
 *
 * Existing program enrollments are left as they are.
 *
 * Dry run (default):
 *   pnpm script partners/ban-partners-from-network
 *
 * Apply:
 *   pnpm script partners/ban-partners-from-network \
 *     --execute \
 *     --reviewed-by=you@dub.co
 */

import { readFileSync } from "node:fs";

import { prisma } from "@/lib/prisma";
import { MAX_FRAUD_REASON_LENGTH } from "@/lib/zod/schemas/partners";
import "dotenv-flow/config";
import { flagPartnerForFraud } from "../../lib/api/fraud/flag-partner-for-fraud";
import { banPartnerFromNetwork } from "../../lib/api/partners/network-ban";

// Current ids are 25 uppercase characters. Older ids are 24 mixed-case characters.
const PARTNER_ID_PATTERN = /^pn_(?:[0-9A-Z]{25}|[0-9A-Za-z]{24})$/;

// Reason stored on each confirmed admin fraud alert. Edit this, or pass
// --message=... / --message-file=... when you run the script.
const FRAUD_ALERT_MESSAGE = "Fradulent Stripe upgrades";

const PARTNER_IDS = [
  "pn_1JZ14HBXQSVXH4H9CK5A7SDFB",
  "pn_1KRZJHDQRBAE1Q9QH63NH7GHZ",
  "pn_1KXKHHWYQ5F5A03A7AEJD97V6",
  "pn_1KXQZ0ARE8NBEDJ6S4MDQBBMA",
  "pn_1KZKWNFR6TMC91473E8F180JK",
  "pn_1M4P7BDBMCA6133Y5SD0EQ2EE",
  "pn_Y9JgXKpHOGjzCuMCw9dv6iu1",
  "pn_1KCC7K15DNFPFHYCRXVXH40FK",
  "pn_1KDFWQNH98GC9KEW29RV1WHY9",
  "pn_1KHGJVNV8AGE4054WA7MAR7K9",
  "pn_1KKJH8VCXZE7WE6XN7M655MA1",
  "pn_1KKJPHJJG4BK6NJDA0V6P92CN",
  "pn_1KKK2TG8TBT5118FFWPN0C35X",
  "pn_1KKQRW1Q10DH7C5NF9JZPJVS0",
  "pn_1KM2H07BMNRY80693B86M0BBT",
  "pn_1KM4EHDMNWSDJP03QPA5PQAQY",
  "pn_1KM7NTVMS8HKXVXF23E9T4XRW",
  "pn_1KMFH16M1S1ZCSETE2JJEEE89",
  "pn_1KNBZP29JGH17Y9BAJJGEW2SX",
  "pn_1KNXANKJW4N8FEFGRFV7BS8RG",
] as const;

function assertPartnerIds() {
  const seen = new Set<string>();

  for (const partnerId of PARTNER_IDS) {
    if (!PARTNER_ID_PATTERN.test(partnerId)) {
      throw new Error(`Invalid partner id: ${partnerId}`);
    }

    if (seen.has(partnerId)) {
      throw new Error(`${partnerId} is listed more than once.`);
    }

    seen.add(partnerId);
  }
}

function parseArgs(argv: string[]) {
  let execute = false;
  let message: string | undefined;
  let messageFile: string | undefined;
  let reviewedBy: string | undefined;

  for (const arg of argv) {
    if (arg === "--execute") {
      execute = true;
    } else if (arg.startsWith("--message=")) {
      message = arg.slice("--message=".length);
    } else if (arg.startsWith("--message-file=")) {
      messageFile = arg.slice("--message-file=".length);
    } else if (arg.startsWith("--reviewed-by=")) {
      reviewedBy = arg.slice("--reviewed-by=".length);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (message !== undefined && messageFile !== undefined) {
    throw new Error("Pass --message or --message-file, not both.");
  }

  if (message === "") {
    throw new Error("--message cannot be empty.");
  }

  if (messageFile === "") {
    throw new Error("--message-file cannot be empty.");
  }

  if (reviewedBy === "") {
    throw new Error("--reviewed-by cannot be empty.");
  }

  return { execute, message, messageFile, reviewedBy };
}

function resolveFraudAlertMessage({
  message,
  messageFile,
}: {
  message?: string;
  messageFile?: string;
}) {
  const raw = messageFile
    ? readFileSync(messageFile, "utf8")
    : message ?? FRAUD_ALERT_MESSAGE;
  const reason = raw.trim();

  if (reason.length > MAX_FRAUD_REASON_LENGTH) {
    throw new Error(
      `Fraud alert message is ${reason.length} characters. The maximum is ${MAX_FRAUD_REASON_LENGTH}.`,
    );
  }

  return reason;
}

async function resolveReviewerId(reviewedBy: string) {
  const user = await prisma.user.findUnique({
    where: reviewedBy.startsWith("user_")
      ? { id: reviewedBy }
      : { email: reviewedBy },
    select: {
      id: true,
      email: true,
    },
  });

  if (!user) {
    throw new Error(`No user found for ${reviewedBy}.`);
  }

  return user;
}

async function main() {
  assertPartnerIds();

  const { execute, message, messageFile, reviewedBy } = parseArgs(
    process.argv.slice(2),
  );
  const reason = resolveFraudAlertMessage({ message, messageFile });

  console.log(
    `${execute ? "Executing" : "Dry run"}: ${PARTNER_IDS.length} partners.`,
  );

  if (reason.length === 0) {
    console.log(
      "Fraud alert message is empty. Set FRAUD_ALERT_MESSAGE or pass --message / --message-file.",
    );
  } else {
    console.log(`Fraud alert message (${reason.length} characters):`);
    console.log(reason);
  }

  const partners = await prisma.partner.findMany({
    where: {
      id: {
        in: [...PARTNER_IDS],
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      country: true,
      networkStatus: true,
    },
  });

  const partnersById = new Map(
    partners.map((partner) => [partner.id, partner]),
  );

  const missing = PARTNER_IDS.filter(
    (partnerId) => !partnersById.has(partnerId),
  );
  const alreadyBanned = PARTNER_IDS.filter(
    (partnerId) => partnersById.get(partnerId)?.networkStatus === "banned",
  );
  const toBan = PARTNER_IDS.filter((partnerId) => {
    const partner = partnersById.get(partnerId);
    return partner != null && partner.networkStatus !== "banned";
  });

  console.log(
    `Found ${partners.length}. Missing ${missing.length}. Already banned ${alreadyBanned.length}. To ban ${toBan.length}.`,
  );

  if (missing.length > 0) {
    console.log("Missing partners:");
    console.table(missing.map((partnerId) => ({ partnerId })));
  }

  if (alreadyBanned.length > 0) {
    console.log(
      "Already banned from the network. These partners are left unchanged:",
    );
    console.table(
      alreadyBanned.map((partnerId) => ({
        partnerId,
        email: partnersById.get(partnerId)?.email,
      })),
    );
  }

  console.table(
    toBan.map((partnerId) => {
      const partner = partnersById.get(partnerId);

      return {
        partnerId,
        name: partner?.name,
        email: partner?.email,
        country: partner?.country,
        networkStatus: partner?.networkStatus,
      };
    }),
  );

  if (!execute) {
    console.log(
      "Dry run. Re-run with --execute --reviewed-by=<user id or email> to ban partners who are not already banned and confirm a fraud alert.",
    );

    if (missing.length > 0) {
      process.exitCode = 1;
    }

    return;
  }

  if (reason.length === 0) {
    throw new Error(
      "A fraud alert message is required. Set FRAUD_ALERT_MESSAGE or pass --message / --message-file.",
    );
  }

  if (!reviewedBy) {
    throw new Error(
      "Pass --reviewed-by=<user id or email> so the fraud alert has a reviewer.",
    );
  }

  const reviewer = await resolveReviewerId(reviewedBy);
  console.log(
    `Fraud alerts will be reviewed by ${reviewer.email ?? reviewer.id}.`,
  );

  let banned = 0;
  let skipped = 0;
  let failed = 0;

  for (const partnerId of toBan) {
    const partner = await prisma.partner.findUnique({
      where: {
        id: partnerId,
      },
      select: {
        networkStatus: true,
      },
    });

    if (!partner) {
      failed += 1;
      console.error(`Partner ${partnerId} was not found.`);
      continue;
    }

    // Check again at write time. A partner banned since the preview is left alone.
    if (partner.networkStatus === "banned") {
      skipped += 1;
      console.log(`Skipping ${partnerId}; already banned from the network.`);
      continue;
    }

    try {
      const result = await flagPartnerForFraud({
        partnerId,
        reason,
        reviewedById: reviewer.id,
        banFromNetwork: true,
      });

      if (result.status === "flagged") {
        banned += 1;
        console.log(
          `Banned ${partnerId}. Alerted ${result.alertedProgramsCount} programs.`,
        );
        continue;
      }

      // No new alert is possible. Still ban when the partner is not already banned.
      if (
        result.status === "already_flagged" ||
        result.status === "no_active_enrollments"
      ) {
        await banPartnerFromNetwork(partnerId);
        banned += 1;
        console.log(
          `Banned ${partnerId} without a new fraud alert (${result.status}).`,
        );
        continue;
      }

      failed += 1;
      console.error(`Failed to ban ${partnerId}: ${result.status}.`);
    } catch (error) {
      failed += 1;
      console.error(`Failed to ban ${partnerId}`, error);
    }
  }

  console.log(
    `Banned ${banned}. Skipped ${skipped + alreadyBanned.length}. Failed ${failed}. Missing ${missing.length}.`,
  );

  if (failed > 0 || missing.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
