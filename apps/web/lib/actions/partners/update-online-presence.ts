"use server";

import {
  generateCodeChallengeHash,
  generateCodeVerifier,
} from "@/lib/api/oauth/utils";
import { parseUrlSchemaAllowEmpty } from "@/lib/zod/schemas/utils";
import { prisma } from "@dub/prisma";
import { PARTNERS_DOMAIN_WITH_NGROK } from "@dub/utils";
import { cookies } from "next/headers";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { authPartnerActionClient } from "../safe-action";
import { ONLINE_PRESENCE_PROVIDERS } from "./online-presence-providers";

const updateOnlinePresenceSchema = z.object({
  website: parseUrlSchemaAllowEmpty().nullish(),
  youtube: z.string().nullish(),
  twitter: z.string().nullish(),
  linkedin: z.string().nullish(),
  instagram: z.string().nullish(),
  tiktok: z.string().nullish(),
  source: z.enum(["onboarding", "settings"]).default("onboarding"),
});

const updateOnlinePresenceResponseSchema = updateOnlinePresenceSchema.merge(
  z.object({
    websiteTxtRecord: z.string().nullable(),
    verificationUrls: z.record(z.string().url()),
  }),
);

export const updateOnlinePresenceAction = authPartnerActionClient
  .schema(updateOnlinePresenceSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner } = ctx;

    let domainChanged = false;

    try {
      let oldDomain = partner.website
        ? new URL(partner.website).hostname
        : null;
      let newDomain = parsedInput.website
        ? new URL(parsedInput.website).hostname
        : null;
      domainChanged = oldDomain !== newDomain;
    } catch (e) {
      console.error(
        "Failed to get domain from partner website",
        { old: partner.website, new: parsedInput.website },
        e,
      );
      domainChanged = true;
    }

    const updateData = {
      ...(parsedInput.website !== undefined && {
        website: parsedInput.website,
        ...(domainChanged && {
          websiteVerifiedAt: null,
          websiteTxtRecord: `dub-domain-verification=${uuid()}`,
        }),
      }),
      ...(parsedInput.youtube !== undefined && {
        youtube: parsedInput.youtube,
        youtubeVerifiedAt:
          parsedInput.youtube !== partner.youtube ? null : undefined,
      }),
      ...(parsedInput.twitter !== undefined && {
        twitter: parsedInput.twitter,
        twitterVerifiedAt:
          parsedInput.twitter !== partner.twitter ? null : undefined,
      }),
      ...(parsedInput.linkedin !== undefined && {
        linkedin: parsedInput.linkedin,
        linkedinVerifiedAt:
          parsedInput.linkedin !== partner.linkedin ? null : undefined,
      }),
      ...(parsedInput.instagram !== undefined && {
        instagram: parsedInput.instagram,
        instagramVerifiedAt:
          parsedInput.instagram !== partner.instagram ? null : undefined,
      }),
      ...(parsedInput.tiktok !== undefined && {
        tiktok: parsedInput.tiktok,
        tiktokVerifiedAt:
          parsedInput.tiktok !== partner.tiktok ? null : undefined,
      }),
    };

    const updatedPartner = await prisma.partner.update({
      where: {
        id: partner.id,
      },
      data: updateData,
    });

    return {
      success: true,
      ...updateOnlinePresenceResponseSchema.parse({
        ...updatedPartner,
        verificationUrls: Object.fromEntries(
          await Promise.all(
            Object.entries(ONLINE_PRESENCE_PROVIDERS)
              .filter(
                ([key, data]) =>
                  updatedPartner[key] && !updatedPartner[data.verifiedColumn],
              )
              .map(async ([key, data]) => {
                if (!data.clientId) return [key, null];

                const params: Record<string, string> = {
                  [data.clientIdParam ?? "client_id"]: data.clientId,
                  redirect_uri: `${PARTNERS_DOMAIN_WITH_NGROK}/api/partners/online-presence/callback`,
                  scope: data.scopes,
                  response_type: "code",
                  state: Buffer.from(
                    JSON.stringify({
                      provider: key,
                      partnerId: partner.id,
                      source: parsedInput.source,
                    }),
                  ).toString("base64"),
                };

                if (data.pkce) {
                  const codeVerifier = generateCodeVerifier();
                  const codeChallenge =
                    await generateCodeChallengeHash(codeVerifier);

                  // Store code verifier in cookie
                  cookies().set("online_presence_code_verifier", codeVerifier, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    maxAge: 60 * 5, // 5 minutes
                  });

                  params.code_challenge = codeChallenge;
                  params.code_challenge_method = "S256";
                }

                return [
                  key,
                  `${data.authUrl}?${new URLSearchParams(params).toString()}`,
                ];
              }),
          ),
        ),
      }),
    };
  });
