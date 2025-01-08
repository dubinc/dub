"use server";

import { createId } from "@/lib/api/utils";
import { updateConfig } from "@/lib/edge-config";
import { recordLink } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";

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
  const [createdPartner, updatedLink] = await Promise.all([
    prisma.partner.create({
      data: {
        id: createId({ prefix: "pn_" }),
        name: partner.name,
        email: partner.email,
        image: partner.image,
        country: "US",
        programs: {
          create: {
            programId,
            linkId,
            status: "approved",
          },
        },
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
  return createdPartner;
};
