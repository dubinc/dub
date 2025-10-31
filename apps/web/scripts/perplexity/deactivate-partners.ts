import PartnerDeactivated from "@dub/email/templates/partner-deactivated";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { linkCache } from "../../lib/api/links/cache";
import { queueBatchEmail } from "../../lib/email/queue-batch-email";

async function main() {
  const programId = "prog_xxx";
  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
  });

  const partners = await prisma.programEnrollment.findMany({
    where: {
      programId,
      status: "approved",
      groupId: "grp_xxx",
      partner: {
        users: {
          some: {},
        },
      },
    },
    include: {
      links: true,
      partner: true,
    },
    take: 500,
  });

  const where = {
    programId,
    partnerId: {
      in: partners.map((p) => p.partnerId),
    },
  };

  const prismaRes = await prisma.$transaction([
    prisma.link.updateMany({
      where,
      data: {
        expiresAt: new Date(),
      },
    }),

    prisma.programEnrollment.updateMany({
      where,
      data: {
        status: "deactivated",
      },
    }),
  ]);
  console.log("prismaRes", prismaRes);

  const partnerLinks = partners.flatMap((p) => p.links);
  const redisRes = await linkCache.expireMany(partnerLinks);
  console.log("redisRes", redisRes);

  const qstashRes = await queueBatchEmail<typeof PartnerDeactivated>(
    partners
      .filter((p) => p.partner.email)
      .map((p) => ({
        variant: "notifications",
        subject: "Your partnership with Perplexity has been deactivated",
        to: p.partner.email!,
        replyTo: program.supportEmail || "noreply",
        templateName: "PartnerDeactivated",
        templateProps: {
          partner: {
            name: p.partner.name,
            email: p.partner.email!,
          },
          program: {
            name: program.name,
            slug: program.slug,
          },
          deactivatedReason: "because...",
        },
      })),
  );
  console.log("qstashRes", qstashRes);
}

main();
