import { deleteDiscountCodes } from "@/lib/api/discounts/delete-discount-code";
import { linkCache } from "@/lib/api/links/cache";
import { withCron } from "@/lib/cron/with-cron";
import { sendBatchEmail } from "@dub/email";
import PartnerDeactivated from "@dub/email/templates/partner-deactivated";
import { prisma } from "@dub/prisma";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

const inputSchema = z.object({
  programId: z.string(),
  partnerIds: z.array(z.string()),
  programDeactivated: z.boolean().optional().default(false),
});

// POST /api/cron/partners/deactivate - deactivate partners in a program
export const POST = withCron(async ({ rawBody }) => {
  const { programId, partnerIds, programDeactivated } = inputSchema.parse(
    JSON.parse(rawBody),
  );

  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      programId,
      partnerId: {
        in: partnerIds,
      },
    },
    include: {
      partner: {
        include: {
          _count: {
            select: {
              users: true,
            },
          },
        },
      },
      links: true,
      discountCodes: true,
    },
  });

  // Expire all links in cache
  const links = programEnrollments.flatMap(({ links }) => links);
  await linkCache.expireMany(links);
  console.log("[bulkDeactivatePartners] Expired links in cache.");

  // Queue discount code deletions
  const discountCodes = programEnrollments.flatMap(({ discountCodes }) =>
    discountCodes.map((dc) => dc),
  );
  await deleteDiscountCodes(discountCodes);
  console.log("[bulkDeactivatePartners] Queued discount code deletions.");

  // Find the program
  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
    select: {
      name: true,
      slug: true,
      supportEmail: true,
    },
  });

  // Send notification emails
  const emailResponse = await sendBatchEmail(
    programEnrollments
      // only notify partners with user accounts (meaning they've signed up on partners.dub.co)
      .filter(({ partner }) => partner._count.users > 0)
      .map(({ partner }) => ({
        variant: "notifications",
        subject: programDeactivated
          ? `The ${program.name} program has been deactivated`
          : `Your partnership with ${program.name} has been deactivated`,
        to: partner.email!,
        replyTo: program.supportEmail || "noreply",
        react: PartnerDeactivated({
          partner: {
            name: partner.name,
            email: partner.email!,
          },
          program: {
            name: program.name,
            slug: program.slug,
          },
          programDeactivated,
        }),
      })),
  );

  console.log("[bulkDeactivatePartners] Sent notification emails.", {
    response: emailResponse,
  });

  return logAndRespond(
    `[bulkDeactivatePartners] Deactivated ${partnerIds.length} partners for program ${programId}.`,
  );
});
