import { extractEmailDomain } from "@/lib/email/extract-email-domain";
import { prisma } from "@/lib/prisma";
import { TREMENDOUS_PROHIBITED_TOP_LEVEL_DOMAINS } from "@/lib/tremendous/constants";
import "dotenv-flow/config";
import { redis } from "../../../lib/upstash";

function isProhibitedTld(domain: string) {
  return TREMENDOUS_PROHIBITED_TOP_LEVEL_DOMAINS.some((tld) =>
    domain.endsWith(tld),
  );
}

async function main() {
  const enrollments = await prisma.programEnrollment.findMany({
    where: {
      groupId: "grp_xxx",
      partner: {
        defaultPayoutMethod: null,
        payoutsEnabledAt: null,
        tremendousEmail: null,
      },
    },
    include: {
      partner: true,
    },
  });

  if (enrollments.length === 0) {
    console.log("No enrollments found");
    return;
  }

  const partners = enrollments.map(({ partner }) => partner);

  const emailDomains = [
    ...new Set(
      partners
        .map((partner) =>
          partner.email ? extractEmailDomain(partner.email) : null,
        )
        .filter((domain): domain is string => domain !== null),
    ),
  ];

  const isProhibitedDomain =
    emailDomains.length > 0
      ? await redis.smismember("tremendousProhibitedEmailDomains", emailDomains)
      : [];

  const prohibitedDomains = new Set(
    emailDomains.filter((_, index) => isProhibitedDomain[index]),
  );

  const ineligiblePartners: string[] = [];

  const eligiblePartners = partners.filter((partner) => {
    if (!partner.email) {
      return false;
    }

    const domain = extractEmailDomain(partner.email);

    if (!domain) {
      return false;
    }

    if (prohibitedDomains.has(domain)) {
      ineligiblePartners.push(partner.email);
      return false;
    }

    if (isProhibitedTld(domain)) {
      ineligiblePartners.push(partner.email);
      return false;
    }

    return true;
  });

  console.log(
    `Found ${partners.length} partners, ${eligiblePartners.length} eligible, ${partners.length - eligiblePartners.length} skipped`,
  );
  console.log(`Ineligible partners: ${ineligiblePartners.join(", ")}`);

  for (const partner of eligiblePartners) {
    await prisma.partner.update({
      where: {
        id: partner.id,
      },
      data: {
        defaultPayoutMethod: "tremendous",
        payoutsEnabledAt: new Date(),
        tremendousEmail: partner.email,
      },
    });

    console.log(
      `Set tremendous email for partner ${partner.name} (${partner.email})`,
    );
  }
}

main();
