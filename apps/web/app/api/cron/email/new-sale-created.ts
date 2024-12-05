import { limiter } from "@/lib/cron/limiter";
import { prisma } from "@/lib/prisma";
import z from "@/lib/zod";
import { sendEmail } from "emails";
import NewSaleCreated from "emails/new-sale-created";

const schema = z.object({
  saleId: z.string(),
});

// Notify the partner about the new sale came via their referral link
export const newSaleCreated = async (payload: any) => {
  const { saleId } = schema.parse(payload);

  const { program, partner, ...sale } = await prisma.sale.findUniqueOrThrow({
    where: {
      id: saleId,
    },
    select: {
      amount: true,
      earnings: true,
      program: {
        select: {
          id: true,
          name: true,
          logo: true,
        },
      },
      partner: {
        select: {
          id: true,
          programs: {
            select: {
              link: {
                select: {
                  shortLink: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const referralLink = partner.programs[0].link?.shortLink!;

  const partnerUsers = await prisma.partnerUser.findMany({
    where: {
      partnerId: partner.id,
    },
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  return await Promise.all(
    partnerUsers.map(({ user }) =>
      limiter.schedule(() =>
        sendEmail({
          subject: "You just made a sale via Dub Partners!",
          from: "Dub Partners <system@dub.co>",
          email: user.email!,
          react: NewSaleCreated({
            email: user.email!,
            program,
            partner: {
              id: partner.id,
              referralLink,
            },
            sale,
          }),
        }),
      ),
    ),
  );
};
