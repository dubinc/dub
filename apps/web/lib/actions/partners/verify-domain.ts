"use server";

import { prisma } from "@dub/prisma";
import dns from "dns";
import { authPartnerActionClient } from "../safe-action";

export const verifyDomainAction = authPartnerActionClient.action(
  async ({ ctx }) => {
    const { partner } = ctx;

    const partnerPlatform = await prisma.partnerPlatform.findUnique({
      where: {
        partnerId_platform: {
          partnerId: partner.id,
          platform: "website",
        },
      },
    });

    if (!partnerPlatform || !partnerPlatform.handle) {
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
      domain = new URL(partnerPlatform.handle).hostname;
    } catch (e) {
      throw new Error("Please make sure the website is a valid URL.");
    }

    const valid = await new Promise((resolve, reject) =>
      dns.resolveTxt(domain, (err, addresses) => {
        if (err) {
          reject(err);
        } else {
          resolve(
            addresses.some(
              (address) =>
                partner.websiteTxtRecord &&
                address.includes(partner.websiteTxtRecord),
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

    const updatedPartnerPlatform = await prisma.partnerPlatform.update({
      where: {
        partnerId_platform: {
          partnerId: partner.id,
          platform: "website",
        },
      },
      data: {
        verifiedAt: new Date(),
      },
    });

    return {
      verifiedAt: updatedPartnerPlatform.verifiedAt!,
    };
  },
);
