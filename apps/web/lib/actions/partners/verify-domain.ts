"use server";

import { prisma } from "@dub/prisma";
import dns from "dns";
import { authPartnerActionClient } from "../safe-action";

export const verifyDomainAction = authPartnerActionClient.action(
  async ({ ctx }) => {
    const { partner } = ctx;

    if (!partner.website || !partner.websiteTxtRecord)
      throw new Error(
        "Failed to verify domain: website or websiteTxtRecord is not set",
      );

    let domain: string | null = null;

    try {
      domain = new URL(partner.website).hostname;
    } catch (e) {
      throw new Error("Failed to get domain from website");
    }

    const valid = await new Promise((resolve, reject) =>
      dns.resolveTxt(domain, (err, addresses) => {
        if (err) reject(err);
        else
          resolve(
            addresses.some(
              (address) =>
                partner.websiteTxtRecord &&
                address.includes(partner.websiteTxtRecord),
            ),
          );
      }),
    );

    if (!valid) throw new Error("TXT record not found");

    await prisma.partner.update({
      where: {
        id: partner.id,
      },
      data: {
        websiteVerifiedAt: new Date(),
      },
    });

    return {
      success: true,
      websiteVerifiedAt: new Date(),
    };
  },
);
