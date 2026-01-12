"use server";

import { prisma } from "@dub/prisma";
import dns from "dns";
import { authPartnerActionClient } from "../safe-action";

export const verifyDomainAction = authPartnerActionClient.action(
  async ({ ctx }) => {
    const { partner } = ctx;

    const partnerPlatform = await prisma.partnerPlatform.findUnique({
      where: {
        partnerId_type: {
          partnerId: partner.id,
          type: "website",
        },
      },
    });

    if (!partnerPlatform || !partnerPlatform.identifier) {
      throw new Error(
        "Website not found on your partner profile. Please restart the verification process.",
      );
    }

    const metadata = partnerPlatform.metadata as { websiteTxtRecord: string };

    if (!metadata || !metadata.websiteTxtRecord) {
      throw new Error(
        "Website verification data not found. Please restart the verification process.",
      );
    }

    let domain: string | null = null;

    try {
      domain = new URL(partnerPlatform.identifier).hostname;
    } catch (e) {
      throw new Error("Please make sure the website is a valid URL.");
    }

    const valid = await new Promise((resolve, reject) =>
      dns.resolveTxt(domain, (err, addresses) => {
        if (err) {
          reject(err);
        } else {
          resolve(
            addresses.some((address) =>
              address.includes(metadata.websiteTxtRecord),
            ),
          );
        }
      }),
    );

    if (!valid) {
      throw new Error(
        "TXT record not found. Please make sure the TXT record is set correctly and try again.",
      );
    }

    await prisma.partnerPlatform.update({
      where: {
        partnerId_type: {
          partnerId: partner.id,
          type: "website",
        },
      },
      data: {
        verifiedAt: new Date(),
      },
    });
  },
);
