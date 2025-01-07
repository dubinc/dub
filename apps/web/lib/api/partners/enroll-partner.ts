"use server";

import { createId } from "@/lib/api/utils";
import { recordLink } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";

export const enrollPartner = async ({
  programId,
  linkId,
  name,
  email,
}: {
  programId: string;
  linkId: string;
  name: string;
  email?: string | null;
}) => {
  const [partner, updatedLink] = await Promise.all([
    prisma.partner.create({
      data: {
        id: createId({ prefix: "pn_" }),
        name,
        email: email || "",
        country: "US",
        programs: {
          create: {
            programId,
            linkId,
            commissionAmount: 0,
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
  waitUntil(recordLink(updatedLink));
  return partner;
};
