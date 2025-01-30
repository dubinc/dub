"use server";

import { createId } from "@/lib/api/utils";
import { updateConfig } from "@/lib/edge-config";
import { recordLink } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { waitUntil } from "@vercel/functions";
import { DubApiError } from "../errors";

export const enrollPartner = async ({
  programId,
  linkId,
  partner,
}: {
  programId: string;
  linkId: string;
  partner: {
    name: string;
    email?: string | null;
    image?: string | null;
  };
}) => {
  if (partner.email) {
    const programEnrollment = await prisma.programEnrollment.findFirst({
      where: {
        programId,
        partner: {
          email: partner.email,
        },
      },
    });

    if (programEnrollment) {
      throw new DubApiError({
        message: `Partner ${partner.email} already enrolled in this program.`,
        code: "conflict",
      });
    }
  }

  const payload: Pick<Prisma.PartnerUpdateInput, "programs"> = {
    programs: {
      create: {
        programId,
        links: {
          connect: {
            id: linkId,
          },
        },
        status: "approved",
      },
    },
  };

  const [upsertedPartner, updatedLink] = await Promise.all([
    prisma.partner.upsert({
      where: {
        email: partner.email ?? "",
      },
      update: payload,
      create: {
        ...payload,
        id: createId({ prefix: "pn_" }),
        name: partner.name,
        email: partner.email,
        image: partner.image,
        country: "US",
      },
    }),
    prisma.link.update({
      where: {
        id: linkId,
      },
      data: {
        programId,
      },
      include: {
        tags: {
          select: {
            tag: true,
          },
        },
      },
    }),
  ]);

  waitUntil(
    Promise.all([
      recordLink(updatedLink),
      // TODO: Remove this once we open up partners.dub.co to everyone
      partner.email &&
        updateConfig({
          key: "partnersPortal",
          value: partner.email,
        }),
    ]),
  );

  return upsertedPartner;
};
