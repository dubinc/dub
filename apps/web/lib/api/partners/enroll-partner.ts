"use server";

import { createId } from "@/lib/api/utils";
import { updateConfig } from "@/lib/edge-config";
import { recordLink } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { waitUntil } from "@vercel/functions";
import { DubApiError } from "../errors";
import { includeTags } from "../links/include-tags";

export const enrollPartner = async ({
  programId,
  linkId,
  tenantId,
  partner,
}: {
  programId: string;
  linkId: string;
  tenantId?: string;
  partner: {
    name: string;
    email?: string | null;
    image?: string | null;
    country?: string | null;
    description?: string | null;
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

  // Check if the tenantId is already enrolled in the program
  if (tenantId) {
    const tenantEnrollment = await prisma.programEnrollment.findUnique({
      where: {
        tenantId_programId: {
          tenantId,
          programId,
        },
      },
    });

    if (tenantEnrollment) {
      throw new DubApiError({
        message: `Tenant ${tenantId} already enrolled in this program.`,
        code: "conflict",
      });
    }
  }

  const payload: Pick<Prisma.PartnerUpdateInput, "programs"> = {
    programs: {
      create: {
        programId,
        tenantId,
        links: {
          connect: {
            id: linkId,
          },
        },
        status: "approved",
      },
    },
  };

  const upsertedPartner = await prisma.partner.upsert({
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
      country: partner.country ?? "US",
      bio: partner.description,
    },
  });

  waitUntil(
    Promise.all([
      // update and record link
      prisma.link
        .update({
          where: {
            id: linkId,
          },
          data: {
            partnerId: upsertedPartner.id,
          },
          include: includeTags,
        })
        .then((link) => recordLink(link)),
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
