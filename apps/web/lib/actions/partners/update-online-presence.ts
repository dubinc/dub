"use server";

import { sanitizeSocialHandle, sanitizeWebsite } from "@/lib/social-utils";
import { partnerSocialPlatformSchema } from "@/lib/zod/schemas/partners";
import { parseUrlSchemaAllowEmpty } from "@/lib/zod/schemas/utils";
import { prisma } from "@dub/prisma";
import { PartnerPlatform } from "@dub/prisma/client";
import { isValidUrl } from "@dub/utils";
import { z } from "zod";
import { authPartnerActionClient } from "../safe-action";

const updateOnlinePresenceSchema = z.object({
  website: parseUrlSchemaAllowEmpty()
    .nullish()
    .transform((input) =>
      input === undefined ? undefined : sanitizeWebsite(input),
    ),
  youtube: z
    .string()
    .nullish()
    .transform((input) =>
      input === undefined ? undefined : sanitizeSocialHandle(input, "youtube"),
    ),
  twitter: z
    .string()
    .nullish()
    .transform((input) =>
      input === undefined ? undefined : sanitizeSocialHandle(input, "twitter"),
    ),
  linkedin: z
    .string()
    .nullish()
    .transform((input) =>
      input === undefined ? undefined : sanitizeSocialHandle(input, "linkedin"),
    ),
  instagram: z
    .string()
    .nullish()
    .transform((input) =>
      input === undefined
        ? undefined
        : sanitizeSocialHandle(input, "instagram"),
    ),
  tiktok: z
    .string()
    .nullish()
    .transform((input) =>
      input === undefined ? undefined : sanitizeSocialHandle(input, "tiktok"),
    ),
  source: z.enum(["onboarding", "settings"]).default("onboarding"),
});

export const updateOnlinePresenceAction = authPartnerActionClient
  .schema(
    updateOnlinePresenceSchema.refine(
      async (data) => {
        return !data.website || isValidUrl(data.website);
      },
      {
        message: "Invalid website URL.",
      },
    ),
  )
  .action(async ({ ctx, parsedInput }) => {
    const { partner } = ctx;

    let partnerPlatform = await prisma.partnerPlatform.findMany({
      where: {
        partnerId: partner.id,
      },
    });

    const platforms = partnerPlatform.map((p) => ({
      platform: p.platform,
      handle: p.handle,
      verifiedAt: p.verifiedAt,
    }));

    const platformHandles = new Map(
      platforms.map((p) => [p.platform, p.handle]),
    );

    // create an array of data to upsert using foreach
    const socialPlatformsData: Pick<
      PartnerPlatform,
      "platform" | "handle" | "verifiedAt"
    >[] = [];

    if (
      parsedInput.youtube &&
      parsedInput.youtube !== platformHandles.get("youtube")
    ) {
      socialPlatformsData.push({
        platform: "youtube",
        handle: parsedInput.youtube,
        verifiedAt: null,
      });
    }

    if (
      parsedInput.twitter &&
      parsedInput.twitter !== platformHandles.get("twitter")
    ) {
      socialPlatformsData.push({
        platform: "twitter",
        handle: parsedInput.twitter,
        verifiedAt: null,
      });
    }

    if (
      parsedInput.linkedin &&
      parsedInput.linkedin !== platformHandles.get("linkedin")
    ) {
      socialPlatformsData.push({
        platform: "linkedin",
        handle: parsedInput.linkedin,
        verifiedAt: null,
      });
    }

    if (
      parsedInput.instagram &&
      parsedInput.instagram !== platformHandles.get("instagram")
    ) {
      socialPlatformsData.push({
        platform: "instagram",
        handle: parsedInput.instagram,
        verifiedAt: null,
      });
    }

    if (
      parsedInput.tiktok &&
      parsedInput.tiktok !== platformHandles.get("tiktok")
    ) {
      socialPlatformsData.push({
        platform: "tiktok",
        handle: parsedInput.tiktok,
        verifiedAt: null,
      });
    }

    if (
      parsedInput.website &&
      parsedInput.website !== platformHandles.get("website")
    ) {
      let domainChanged = false;

      try {
        const website = platformHandles.get("website");
        const oldDomain = website ? new URL(website).hostname : null;
        const newDomain = parsedInput.website
          ? new URL(parsedInput.website).hostname
          : null;

        domainChanged = oldDomain?.toLowerCase() !== newDomain?.toLowerCase();
      } catch (error) {
        console.error("Failed to get domain from partner website", error);
        domainChanged = true;
      }

      if (domainChanged) {
        socialPlatformsData.push({
          platform: "website",
          handle: parsedInput.website,
          verifiedAt: null,
        });
      }
    }

    if (socialPlatformsData.length === 0) {
      return;
    }

    await Promise.all(
      socialPlatformsData.map((item) =>
        prisma.partnerPlatform.upsert({
          where: {
            partnerId_platform: {
              partnerId: partner.id,
              platform: item.platform,
            },
          },
          create: {
            partnerId: partner.id,
            platform: item.platform,
            handle: item.handle,
            verifiedAt: item.verifiedAt,
          },
          update: {
            handle: item.handle,
            verifiedAt: item.verifiedAt,
          },
        }),
      ),
    );

    partnerPlatform = await prisma.partnerPlatform.findMany({
      where: {
        partnerId: partner.id,
      },
    });

    return z.array(partnerSocialPlatformSchema).parse(partnerPlatform);

    // const verificationUrls = Object.fromEntries(
    //   await Promise.all(
    //     Object.entries(ONLINE_PRESENCE_PROVIDERS)
    //       .filter(
    //         ([key, data]) =>
    //           socialPlatformsData.some((p) => p.platform === key && !p.verifiedAt),
    //       )
    //       .map(async ([key, data]) => {
    //         if (!data.clientId) {
    //           return [key, null];
    //         }

    //         const params: Record<string, string> = {
    //           [data.clientIdParam ?? "client_id"]: data.clientId,
    //           redirect_uri: `${PARTNERS_DOMAIN_WITH_NGROK}/api/partners/online-presence/callback`,
    //           scope: data.scopes,
    //           response_type: "code",
    //           state: Buffer.from(
    //             JSON.stringify({
    //               provider: key,
    //               partnerId: partner.id,
    //               source: parsedInput.source,
    //             }),
    //           ).toString("base64"),
    //         };

    //         if (data.pkce) {
    //           const codeVerifier = generateCodeVerifier();
    //           const codeChallenge =
    //             await generateCodeChallengeHash(codeVerifier);

    //           // Store code verifier in cookie
    //           (await cookies()).set(
    //             "online_presence_code_verifier",
    //             codeVerifier,
    //             {
    //               httpOnly: true,
    //               secure: process.env.NODE_ENV === "production",
    //               sameSite: "lax",
    //               maxAge: 60 * 5, // 5 minutes
    //             },
    //           );

    //           params.code_challenge = codeChallenge;
    //           params.code_challenge_method = "S256";
    //         }

    //         return [
    //           key,
    //           `${data.authUrl}?${new URLSearchParams(params).toString()}`,
    //         ];
    //       }),
    //   ),
    // ),
  });
