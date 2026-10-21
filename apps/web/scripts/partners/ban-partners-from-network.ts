/**
 * Bans the Wispr Flow fraud-ring partners from the Dub Partner Network and
 * confirms an admin fraud alert for each one.
 *
 * Partners already banned from the network are skipped. Nothing is written
 * for them, including a new fraud alert.
 *
 * The fraud alert reason is FRAUD_ALERT_MESSAGE below. Override it with
 * --message or --message-file. --execute also needs --reviewed-by, a Dub
 * admin user id (user_...) or email, stored as the alert reviewer.
 *
 * Existing program enrollments are left as they are, including the three
 * pending Tier F applications (those are not rejected here).
 *
 * Dry run (default):
 *   pnpm script partners/ban-partners-from-network
 *
 * Apply:
 *   pnpm script partners/ban-partners-from-network \
 *     --execute \
 *     --reviewed-by=you@dub.co
 *
 * Nam Nguyễn Hoàng is in his own group. The investigation says his subscribers
 * belong mainly to the brand-search group, so he is not mixed into the ring
 * list. This script still network-bans him when he is not already banned.
 */

import { readFileSync } from "node:fs";

import { flagPartnerForFraud } from "@/lib/api/fraud/flag-partner-for-fraud";
import { banPartnerFromNetwork } from "@/lib/api/partners/network-ban";
import { prisma } from "@/lib/prisma";
import { MAX_FRAUD_REASON_LENGTH } from "@/lib/zod/schemas/partners";
import "dotenv-flow/config";

const PARTNER_ID_PATTERN = /^pn_[0-9A-Z]{25}$/;

// Reason stored on each confirmed admin fraud alert. Edit this, or pass
// --message=... / --message-file=... when you run the script.
const FRAUD_ALERT_MESSAGE = `Quick update: we've banned 43 Dub partners for fraud on our program today. Here's what we found:

Together they referred 1,986 customers. 1,598 of those paid, and 1,586 of the paying ones never used the product. 497 of the paid signups were on cards shared by 3+ accounts. Most paid within minutes of signing up, and many came from cards that later turned out to be stolen. It looks like a coordinated group of linked accounts, not 43 independent affiliates.

Banning them cancelled about $6.6k in unpaid commissions. They had already been paid $9,089.18, and we'd like to claw that back. Can you help with that? Here are the partners with paid-out commissions:

Amit (pn_1K9CXR5JT07V05RB4SGZZ4AHY): $1,901.28
Dharmendra Godara (pn_1KAGGDEE1E4MX4MVEESEQMXQM): $1,700.50
Mahesh Godara (pn_1KAE3AQEKMJQ2S3N7JQQRNRN1): $1,598.25
Dinesh Patel (pn_1KGPGDVE6TPHE8NE3W7B9874B): $1,241.27
jordan (pn_1KHT9T9HYJ9V8JD12K8M9J53S): $693.50
Sachin gurjar (pn_1KAE2R8P3PFQBN0TD85NYS9Y5): $560.88
Kaushik Chekhaliya (pn_1JW96M8XG41GDANM0K56DGJBJ): $461.50
agh*** (pn_1K8TD2X15BQH7F8TNHMJ3EPBQ): $427.50
Bagaram (pn_1KZAQW77CNXXHDPZMATMXFNA4): $304.00
Dimpi (pn_1KJ2VS6H4BF6XTMAKKAW04BT9): $114.00
Geeta (pn_1KCGK0Y88R2CKM4ACKEX249AH): $53.25
Kuldeep khanna (pn_1KGS5SAECWFY7RHV8DZSB712Y): $33.25

If any of these accounts are also active on other programs, it'd be worth checking them. And if you can, please flag them (and anyone linked to them) so they can't come back under a new partner account.`;

// 133 partners already banned from the program. Commission totals in the
// investigation cover these accounts plus Nam.
const RING_PARTNER_IDS = [
  "pn_1KXY21XZKCN1NQHN9ZQTFXVHW",
  "pn_1KTNPMEJ7PPZ8HSKCK4AN05QD",
  "pn_1K8X83PJ6ZS4YHGRADPWJJM8Z",
  "pn_1KX6Z01A67RAVSQDY2VXV6GFK",
  "pn_1JZ10S1DXYPMMWP5CQCCN8WEK",
  "pn_1KX70T53BYY84HQD6X35NXG8V",
  "pn_1KGYCPEAZTVZARZ9PXCAVM6YS",
  "pn_1KJ0Z1SYZK1TGRFMY87KK93P4",
  "pn_1KJ2VS6H4BF6XTMAKKAW04BT9",
  "pn_1KGXXCNXY9BVVKVJ67BWCSMJT",
  "pn_1KEYB79QJRZZVYNXWD2FZ5J3H",
  "pn_1K8BQ81QPW2XFDA4HBW3ATT6D",
  "pn_1K8TD2X15BQH7F8TNHMJ3EPBQ",
  "pn_1K9CXR5JT07V05RB4SGZZ4AHY",
  "pn_1M26Q4KRP5RT6HKVN3NH7S3ST",
  "pn_1KS8DZH34C01QV2909Q4W0F5N",
  "pn_1KWYHN1MFVZN9VXZ14FTWAN1H",
  "pn_1M2Z61K4020GX32DKT8PEZVXX",
  "pn_1KHVNRMP1CQ5ZXR9H2XX7ZJKB",
  "pn_1M266W3KF5GSTWS5XGWTH6WYJ",
  "pn_1KHPFB7600HGZG7MEA0823FNV",
  "pn_1M2GJ6RP40FH03NHY8AFXRCEH",
  "pn_1KCGK0Y88R2CKM4ACKEX249AH",
  "pn_1KBAPHT5AED5Q32QBC37Q0MWH",
  "pn_1KTZZNYESGDRW4F4VW8F0S3BJ",
  "pn_1KADFXYWZY1KCAJHQMGJ49NQN",
  "pn_1KHGT656XZHPSVE66S4W2JEXF",
  "pn_1KZPJ95BXC2Q50QMJP8Y5K6DJ",
  "pn_1KPW3XK6V7KP0GH3EN3S6DF8D",
  "pn_1KYR58WGKMV7DGYDBD3FH981P",
  "pn_1KYV4C4G8CAC60EE11RSDE430",
  "pn_1KYC0J9BZAMTNRFGD2QKKBV0C",
  "pn_1M2N3169J99VJA5D0XRBBHZ9G",
  "pn_1KZ0C9TBSP00W7E84RQPD59Z8",
  "pn_1M0QKRS1JRCE74P61RQZQR50T",
  "pn_1M1SA4C4PKZM3564XEY7A27J1",
  "pn_1M1S17JKZN8BA1CYNPF8E8DR1",
  "pn_1KYXVR59HDQA1QRZFX4J4J1VW",
  "pn_1KHH77249P9PXK9YQFCF02E2R",
  "pn_1M0QRRDCEM0NE4F7MZYQ41GQK",
  "pn_1KXVBDQ6K5JEYM3BYGZ2XDF2V",
  "pn_1M0QP9SNSYRBKWESD627CV676",
  "pn_1KBK8ZA55Y0WEX75VYG7V501Y",
  "pn_1KZ8DQ8B045NJM7Q9G7N58DDJ",
  "pn_1M0S77MAEFK64TRKPHX1H724R",
  "pn_1M0SKB56RDPPD9XQ0QQJ8YW40",
  "pn_1M0SSGAWHG0TAWJ7ZEYTBMKKQ",
  "pn_1M0T7MTHPXH3YE0ZZC7Q4FACB",
  "pn_1KXWCZ7DD84N22Q1VV6SH0H53",
  "pn_1KXW3BVAN71K5EDSVZJ9J49DN",
  "pn_1M1F61YAZD6JJHJY2FB8JVEZN",
  "pn_1KXWECS74FEQPERSY83KAYTW4",
  "pn_1KYM6B914J17Q69H1RZ1JBY0Q",
  "pn_1M0SJF97DWRD2D3T5AXQW7NR0",
  "pn_1KYMRTZPEP0NWSP2MYSRVS81X",
  "pn_1KZ6F6D7TCYGDDRHQENBWZWY6",
  "pn_1M0QZ2AE0M16GJFGSXH6G7FPQ",
  "pn_1KZ7GXVRKZV8N7CBR5C1S1ZV4",
  "pn_1KZ9JQ45T62N4HP4P5CBBSKAK",
  "pn_1M0S8E1NEEKF6TA2KRW41VSXM",
  "pn_1M0S5NXNGQM1E9JTHJMY1N0EV",
  "pn_1KXWFDGQMH6S46M3XYM6FGG05",
  "pn_1KWWDGSHAZN4P8BG8189T6RW0",
  "pn_1KXWEQP6NY13XFE2DKNPHE16F",
  "pn_1KXWDJDJKPBE75JQRVWN7WCVR",
  "pn_1M0209M3CBDQFRDMJ683HX1MV",
  "pn_1KZ2NGETTYFPRWJEAGXD17CN6",
  "pn_1KTWDSBS8W4TFT3YZTKYH6C4G",
  "pn_1M0FMCFK0W6H1PQ1CMD7K781H",
  "pn_1M1F786N2TS0QGM1814CK5WSP",
  "pn_1KXV9N9TA4P9YKTRDW2N0BD37",
  "pn_1KYT4ZMVAP4NVDR626JAM1W45",
  "pn_1M1F2GP9R9TJA2PSZ44PH04E9",
  "pn_1M1F7392VPQ8H42G25GR9YPKB",
  "pn_1KXWFYS3892499HFG7VF9SQTP",
  "pn_1M1A11C22W31WHJDT1C196MF4",
  "pn_1KDE01HHNFWJ24PANYSGK4P0T",
  "pn_1KE74ZG2VWRP53H4R4DSDVQ3T",
  "pn_1K959NY9DBQN0XZGDXT7J9KYP",
  "pn_1KGS6TTFG4FS102QY3HY9RPA9",
  "pn_1KXGVWXFKCXE407F7EQCYK18F",
  "pn_1KEPSXPNW6NACZ90WHGH07EEV",
  "pn_1M16CNYKBJY03RF9WPC23K4PJ",
  "pn_1M2XHTFPYQAPQ7PTYM002TBZV",
  "pn_1M2QTT3PNEPNX8R61TFGRCMX6",
  "pn_1M1F74J947HH970YRW3C2F5X4",
  "pn_1KACSMPW5623ZJA1MYSCCFN8E",
  "pn_1M2QXSS8X5QERG5Q2297DMHRM",
  "pn_1M2784RTJ9KWR6Q0A0XKSFB5E",
  "pn_1M2AZARFM35RTK9GRG0689BC2",
  "pn_1M2N7BS9FJVWYYAB69XYDZTST",
  "pn_1KZAVY4YR5259340MKFXM5PCH",
  "pn_1KHT9T9HYJ9V8JD12K8M9J53S",
  "pn_1M168YY04A0JVZR1YNC9MZV72",
  "pn_1KT3K9JKE29NR1STQWB68A3CM",
  "pn_1KGPGDVE6TPHE8NE3W7B9874B",
  "pn_1M31XVHGSM70RZ77C6GS1X8W9",
  "pn_1M10VJJ0DJY231PXHSZK2J13B",
  "pn_1KJVTVX90K047TDDZ3KCZ07FS",
  "pn_1M2VRHZSFMH5FT3TG2R6XBTQT",
  "pn_1M169DQ7VSCEYEVJS7ETWAGHW",
  "pn_1KVTNES0XGF9TGG81BX5TYBB3",
  "pn_1M31YG2728XWKEZA6R4MJ32EH",
  "pn_1KQMQ2584KEQCZB35AMRQXF1B",
  "pn_1M2GJM6D0JCT7J5AVJAS0A1TT",
  "pn_1M1F9PAX0TCWDTHH6111277JY",
  "pn_1JZ14AG3SA22AW0D8MRMRSPF3",
  "pn_1KYYVF6HA0Z45EW4GVVV8JHMG",
  "pn_1KSQQ7T00FEN8M7DJZ3E4YMER",
  "pn_1KZKWNFR6TMC91473E8F180JK",
  "pn_1M3432F9748S61SHQ3F52KP74",
  "pn_1M1F9YA96GFK9M7BCZG32W060",
  "pn_1M16BS8AAF7DMM6BB52AX0JT0",
  "pn_1KYMTJZSENW4D8CWGQJA15EMD",
  "pn_1KYMV02Z86N3T4XCNYVRB3M2Q",
  "pn_1KYMT8MVYZNAV1V7Y8N8QTEHS",
  "pn_1KYZ979NFPSJN0Q25M9V7934J",
  "pn_1KZ157YEC8HTTB13GZ40D0GYG",
  "pn_1KYM6XPC4ZQYN41DFMB7VBP4Y",
  "pn_1K39HXZD235NSF6AYDYY13ZD3",
  "pn_1KYMVH0J941VC40TZP5XFPHH6",
  "pn_1KZ16Y9J792CG5GWTDN806SGT",
  "pn_1KYZD4MY61SHBDRAHW1V4K648",
  "pn_1KYZB6YW1CS4EB1RP62NJY0NY",
  "pn_1KYMVV75AA2E233T4C0CJEKAJ",
  "pn_1KZ0KAPX3V5NDKHY5FGP7EP64",
  "pn_1KYMV7PXEEAVXWDVHCYSB7GTX",
  "pn_1KZ166GYM81J4SACBTH0W4HRX",
  "pn_1KZAQW77CNXXHDPZMATMXFNA4",
  "pn_1KGS1ZZXZCVJQG2YRP5V6W0GJ",
  "pn_1K6KQ905JHKA38K3HFF144CVN",
  "pn_1K11CTD3EJFAE3QN2B9X8H381",
  "pn_1KZ5CKCX76B8HKZ8A8RXF1W4G",
] as const;

// pn_1K58CEY21ZX8XMEV9SVQ72TDT — Nam Nguyễn Hoàng. Brand-search group.
const BRAND_SEARCH_PARTNER_IDS = ["pn_1K58CEY21ZX8XMEV9SVQ72TDT"] as const;

// Dot variants linked to the banned ring.
const TIER_C_PARTNER_IDS = [
  "pn_1KC60WYVYM2HNP5BVK35GX2JX",
  "pn_1KEDNFA59JHYZXJSF0H5EEG3V",
  "pn_1K093X6NAZ949XP4VM62RC2SA",
  "pn_1K093X27R39GCFCC51WM00T8W",
  "pn_1KXQZ0ARE8NBEDJ6S4MDQBBMA",
  "pn_1KWME9XNGCHFQ3R1EN0PYRTZD",
  "pn_1KXKHHWYQ5F5A03A7AEJD97V6",
  "pn_1KTWCYSEZ02WXC3XV1M2AE3Z5",
  "pn_1K7XANVRK6R7HCJJHBQ7ZQZMN",
  "pn_1KX9MQ3VQQNR7CH1JY44WY0KA",
  "pn_1M2TPG5N8FFQ02ES2YXWTPAQZ",
  "pn_1M2WNHCYG5RJFJNC2A3E7PCK9",
  "pn_1M2W43484YWAYAMGMM0MKXND3",
  "pn_1M2WEH78PP2Z7FB5B2DAJ04BE",
  "pn_1M2WMWV96BHD3BWAND01EWXSE",
  "pn_1M2W5CPXY52X3A995BQSJZ5VA",
  "pn_1M4HH9FYKXXG4TCK9VA8V0X9T",
  "pn_1M3CBJM332JDY7VE52N69970V",
  "pn_1M2WJ5SJ1S1G6GF37V0K5PRJN",
] as const;

// Dot-variant batch created Sep 18–20 (IE), not linked by two or more shared inboxes.
const TIER_D_PARTNER_IDS = [
  "pn_1M2TZ6XR0ZT3KWPH7YSJNWKNB",
  "pn_1M2WCMT3NCWFZHG4T55ETCQDE",
  "pn_1M2WDKK1DF7ARW7WS621AET4K",
  "pn_1M2W7TQFMCSNBJ3NYTYD3NBBT",
  "pn_1M2YS204JWPNS8ZGKC82EW95F",
] as const;

// Bulk Outlook / Hotmail pattern.
const TIER_E_PARTNER_IDS = [
  "pn_1KR4SHW7A9Z8STZ3009V65E5G",
  "pn_1KSHYHSHHXP02HEQEYHMNKWC6",
  "pn_1K97Y79NASRNRH77BTGFP0JW7",
  "pn_1KTN301HYD69FTJJFZ68E0P4V",
  "pn_1KAGGDEE1E4MX4MVEESEQMXQM",
  "pn_1KAE2R8P3PFQBN0TD85NYS9Y5",
  "pn_1KG1EH7CNGW0YXZJZNCPKT26S",
  "pn_1KAE3AQEKMJQ2S3N7JQQRNRN1",
  "pn_1KJW7BV49GN09FJEBZVCY8KGB",
  "pn_1JZ10133FFRKC0801WBJMDB81",
  "pn_1M4YSK3Y2B2Y82WMVANJ9KP64",
  "pn_1M3NVR0VRY5NGCP8CGDNCHBR7",
] as const;

// Same payout details as banned partners.
// The first three are pending applicants. This script network-bans them and
// does not reject the program application.
const TIER_F_PARTNER_IDS = [
  "pn_1KE88WY56QTR9GZPH9CV3E09P",
  "pn_1M2QM5X8PDMW00HFH9GX14GPB",
  "pn_1M4RGNTWJRESR5GF5J9EYY0FE",
  "pn_1KYM621KVX22TG1BYN35A9CYB",
  "pn_1KYM6PA246WVYB3TSV8XJFCNK",
  "pn_1M1E1QKPQ1F2H5F6GQFMZ71M8",
  "pn_1M39QB1C8PV38FFA894MJNK8F",
  "pn_1M39Q9XFY4H2HC40WFQQ0E2RS",
] as const;

// One-off email domains.
const TIER_G_PARTNER_IDS = ["pn_1K5X8HH966BBP3CZD1MZK1F2W"] as const;

// From the program's report of 43 banned partners. The other 38 are already
// in the groups above.
const PROGRAM_REPORT_PARTNER_IDS = [
  "pn_1JW96M8XG41GDANM0K56DGJBJ",
  "pn_1KGS5SAECWFY7RHV8DZSB712Y",
  "pn_1KRZJHDQRBAE1Q9QH63NH7GHZ",
  "pn_1KKBJEBQXKEFY901RACJQ2VN8",
  "pn_1M3XW7A4R7051PEAH1RGAGN7G",
] as const;

const partnerGroups = [
  { name: "Ring", partnerIds: RING_PARTNER_IDS, expectedCount: 133 },
  {
    name: "Brand search",
    partnerIds: BRAND_SEARCH_PARTNER_IDS,
    expectedCount: 1,
  },
  { name: "Tier C", partnerIds: TIER_C_PARTNER_IDS, expectedCount: 19 },
  { name: "Tier D", partnerIds: TIER_D_PARTNER_IDS, expectedCount: 5 },
  { name: "Tier E", partnerIds: TIER_E_PARTNER_IDS, expectedCount: 12 },
  { name: "Tier F", partnerIds: TIER_F_PARTNER_IDS, expectedCount: 8 },
  { name: "Tier G", partnerIds: TIER_G_PARTNER_IDS, expectedCount: 1 },
  {
    name: "Program report",
    partnerIds: PROGRAM_REPORT_PARTNER_IDS,
    expectedCount: 5,
  },
] as const;

function assertPartnerGroups() {
  const seen = new Map<string, string>();

  for (const group of partnerGroups) {
    if (group.partnerIds.length !== group.expectedCount) {
      throw new Error(
        `${group.name} has ${group.partnerIds.length} partner ids, expected ${group.expectedCount}.`,
      );
    }

    for (const partnerId of group.partnerIds) {
      if (!PARTNER_ID_PATTERN.test(partnerId)) {
        throw new Error(
          `${group.name} has an invalid partner id: ${partnerId}`,
        );
      }

      const existingGroup = seen.get(partnerId);

      if (existingGroup) {
        throw new Error(
          `${partnerId} is listed in both ${existingGroup} and ${group.name}.`,
        );
      }

      seen.set(partnerId, group.name);
    }
  }
}

const partnersToBan = partnerGroups.flatMap((group) =>
  group.partnerIds.map((partnerId) => ({
    partnerId,
    group: group.name,
  })),
);

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
  assertPartnerGroups();

  const { execute, message, messageFile, reviewedBy } = parseArgs(
    process.argv.slice(2),
  );
  const reason = resolveFraudAlertMessage({ message, messageFile });

  console.log(
    `${execute ? "Executing" : "Dry run"}: ${partnersToBan.length} partners across ${partnerGroups.length} groups.`,
  );

  for (const group of partnerGroups) {
    console.log(`  ${group.name}: ${group.partnerIds.length}`);
  }

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
        in: partnersToBan.map(({ partnerId }) => partnerId),
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

  const missing = partnersToBan.filter(
    ({ partnerId }) => !partnersById.has(partnerId),
  );
  const alreadyBanned = partnersToBan.filter(
    ({ partnerId }) => partnersById.get(partnerId)?.networkStatus === "banned",
  );
  const toBan = partnersToBan.filter(({ partnerId }) => {
    const partner = partnersById.get(partnerId);
    return partner != null && partner.networkStatus !== "banned";
  });

  console.log(
    `Found ${partners.length}. Missing ${missing.length}. Already banned ${alreadyBanned.length}. To ban ${toBan.length}.`,
  );

  if (missing.length > 0) {
    console.log("Missing partners:");
    console.table(missing);
  }

  if (alreadyBanned.length > 0) {
    console.log(
      "Already banned from the network. These partners are left unchanged:",
    );
    console.table(
      alreadyBanned.map(({ partnerId, group }) => ({
        group,
        partnerId,
        email: partnersById.get(partnerId)?.email,
      })),
    );
  }

  console.table(
    toBan.map(({ partnerId, group }) => {
      const partner = partnersById.get(partnerId);

      return {
        group,
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

  for (const { partnerId, group } of toBan) {
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
      console.error(`Partner ${partnerId} (${group}) was not found.`);
      continue;
    }

    // Check again at write time. A partner banned since the preview is left alone.
    if (partner.networkStatus === "banned") {
      skipped += 1;
      console.log(
        `Skipping ${partnerId} (${group}); already banned from the network.`,
      );
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
          `Banned ${partnerId} (${group}). Alerted ${result.alertedProgramsCount} programs.`,
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
          `Banned ${partnerId} (${group}) without a new fraud alert (${result.status}).`,
        );
        continue;
      }

      failed += 1;
      console.error(`Failed to ban ${partnerId} (${group}): ${result.status}.`);
    } catch (error) {
      failed += 1;
      console.error(`Failed to ban ${partnerId} (${group})`, error);
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
