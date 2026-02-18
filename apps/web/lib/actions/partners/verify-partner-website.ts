"use server";

import { prisma } from "@dub/prisma";
import { getDomainWithoutWWW } from "@dub/utils";
import dns from "dns";
import { authPartnerActionClient } from "../safe-action";

export const verifyPartnerWebsiteAction = authPartnerActionClient.action(
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
      domain = getDomainWithoutWWW(partnerPlatform.identifier)!;
    } catch (e) {
      throw new Error("Please make sure the website is a valid URL.");
    }

    // Use a custom resolver with public DNS to avoid system/OS DNS cache
    const resolver = new dns.Resolver();
    resolver.setServers(["8.8.8.8", "1.1.1.1"]);

    const valid = await new Promise<boolean>((resolve, reject) => {
      resolver.resolveTxt(domain!, (err, addresses) => {
        if (err) {
          reject(err);
        } else {
          resolve(
            addresses.some(
              (address) => address.join("").includes(metadata.websiteTxtRecord), // join because resolveTxt returns string[][]
            ),
          );
        }
      });
    });

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
