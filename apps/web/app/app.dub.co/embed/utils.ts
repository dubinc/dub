import { createLinkAndEnrollPartner } from "@/lib/api/partners/enroll-partner";
import { embedToken } from "@/lib/embed/embed-token";
import { determinePartnerReward } from "@/lib/partners/determine-partner-reward";
import { WorkspaceProps } from "@/lib/types";
import { DiscountSchema } from "@/lib/zod/schemas/discount";
import { prisma } from "@dub/prisma";
import { Discount, Link, Program, ProgramEnrollment } from "@prisma/client";
import { notFound } from "next/navigation";

export const getEmbedData = async (token: string) => {
  const { programId, partnerId, partner } = (await embedToken.get(token)) ?? {};

  if (!programId || !partnerId || !partner) {
    console.error("[Embed] No programId, partnerId, or partner found.");
    notFound();
  }

  let programEnrollment:
    | (ProgramEnrollment & {
        links: Link[];
        program: Program;
        discount: Discount | null;
      })
    | null = null;

  if (partnerId) {
    programEnrollment = await prisma.programEnrollment.findUnique({
      where: {
        partnerId_programId: {
          partnerId,
          programId,
        },
      },
      include: {
        links: true,
        program: true,
        discount: true,
      },
    });
  }

  if (partner) {
    const { email } = partner;

    const partnerFound = await prisma.partner.findUnique({
      where: {
        email,
      },
    });

    if (!partnerFound) {
      const { workspace, ...program } = await prisma.program.findUniqueOrThrow({
        where: {
          id: programId,
        },
        include: {
          workspace: true,
        },
      });

      await createLinkAndEnrollPartner({
        workspace: workspace as WorkspaceProps,
        program,
        partner: {
          ...partner,
          programId,
        },
        userId: "", // TODO: fix this
      });

      programEnrollment = await prisma.programEnrollment.findUnique({
        where: {
          partnerId_programId: {
            partnerId,
            programId,
          },
        },
        include: {
          links: true,
          program: true,
          discount: true,
        },
      });
    }
  }

  if (!programEnrollment) {
    notFound();
  }

  const reward = await determinePartnerReward({
    programId,
    partnerId,
    event: "sale",
  });

  const { program, links } = programEnrollment;

  const payouts = await prisma.payout.groupBy({
    by: ["status"],
    _sum: {
      amount: true,
    },
    where: {
      programId: program.id,
      partnerId: programEnrollment?.partnerId,
    },
  });

  return {
    program,
    links,
    reward,
    discount: programEnrollment.discount
      ? DiscountSchema.parse(programEnrollment.discount)
      : null,
    payouts: payouts.map((payout) => ({
      status: payout.status,
      amount: payout._sum.amount ?? 0,
    })),
    stats: {
      clicks: links.reduce((acc, link) => acc + link.clicks, 0),
      leads: links.reduce((acc, link) => acc + link.leads, 0),
      sales: links.reduce((acc, link) => acc + link.sales, 0),
    },
  };
};
