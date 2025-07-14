import { prisma } from "@dub/prisma";
import { PartnerStackApi } from "./api";
import { MAX_BATCHES, partnerStackImporter } from "./importer";
import { PartnerStackImportPayload } from "./types";

export async function importCommissions(payload: PartnerStackImportPayload) {
  const { programId, startingAfter } = payload;

  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
    select: {
      workspaceId: true,
    },
  });

  const { publicKey, secretKey } = await partnerStackImporter.getCredentials(
    program.workspaceId,
  );

  const partnerStackApi = new PartnerStackApi({
    publicKey,
    secretKey,
  });

  let hasMore = true;
  let processedBatches = 0;
  let currentStartingAfter = startingAfter;

  while (hasMore && processedBatches < MAX_BATCHES) {
    const commissions = await partnerStackApi.listCommissions({
      startingAfter,
    });

    if (commissions.length === 0) {
      hasMore = false;
      break;
    }

    const partners = await prisma.partner.findMany({
      where: {
        email: {
          in: commissions.map(({ partner }) => partner.email),
        },
      },
      select: {
        id: true,
      },
    });

    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        partnerId: {
          in: partners.map((partner) => partner.id),
        },
        programId,
      },
      select: {
        partner: {
          select: {
            id: true,
            email: true,
          },
        },
        links: {
          select: {
            id: true,
            key: true,
            domain: true,
            url: true,
          },
        },
      },
    });

    const partnerEmailToLinks = new Map<
      string,
      (typeof programEnrollments)[0]["links"]
    >();

    for (const { partner, links } of programEnrollments) {
      if (!partner.email) {
        continue;
      }

      partnerEmailToLinks.set(partner.email, links);
    }

    await Promise.allSettled(
      commissions.map(({ partner, ...customer }) =>
        createCustomer({
          workspace,
          customer,
          partner,
          links: partnerEmailToLinks.get(partner.email) ?? [],
        }),
      ),
    );

    await new Promise((resolve) => setTimeout(resolve, 2000));

    processedBatches++;
    currentStartingAfter = commissions[commissions.length - 1].key;
  }

  await partnerStackImporter.queue({
    ...payload,
    ...(hasMore && { startingAfter: currentStartingAfter }),
    action: hasMore ? "import-customers" : "import-commissions",
  });
}
