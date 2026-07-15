import "dotenv-flow/config";

import { parseRegisteredDomainSlugs } from "@/lib/api/domains/is-domain-registration-invoice";
import { setRenewOption } from "@/lib/dynadot/set-renew-option";
import { prisma } from "@/lib/prisma";
import { chunk } from "@dub/utils";

const invoiceId = "inv_1KXANFCDJ9MEYVQ94EM0VM84N";

async function main() {
  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: {
      id: invoiceId,
    },
    select: {
      id: true,
      type: true,
      registeredDomains: true,
    },
  });

  const domains = parseRegisteredDomainSlugs(invoice.registeredDomains);

  if (domains.length === 0) {
    console.error("No domains found for invoice", invoiceId);
    return;
  }

  console.log(`Found ${domains.length} domains for invoice`, invoiceId);

  const registeredDomains = await prisma.registeredDomain.findMany({
    where: {
      slug: {
        in: domains,
      },
    },
    select: {
      slug: true,
      autoRenewalDisabledAt: true,
    },
  });

  if (registeredDomains.length === 0) {
    console.error("No registered domains found for invoice", invoiceId);
    return;
  }

  const domainChunks = chunk(registeredDomains, 10);

  for (const domainChunk of domainChunks) {
    await Promise.all(
      domainChunk.map(async (domain) => {
        const success = await setRenewOption({
          domain: domain.slug,
          autoRenew: domain.autoRenewalDisabledAt === null,
        });

        if (success) {
          console.log(`✓ ${domain}`);
        } else {
          console.error(`✗ ${domain}`);
        }
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
