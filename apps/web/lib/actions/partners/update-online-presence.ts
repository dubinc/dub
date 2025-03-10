"use server";

import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { authPartnerActionClient } from "../safe-action";

const updateOnlinePresenceSchema = z.object({
  website: z.string().url().optional().or(z.literal("")),
  instagram: z.string().optional(),
  tiktok: z.string().optional(),
  youtube: z.string().optional(),
  twitter: z.string().optional(),
  source: z.enum(["onboarding", "settings"]).optional().default("onboarding"),
});

const updateOnlinePresenceResponseSchema = updateOnlinePresenceSchema.merge(
  z.object({
    websiteTxtRecord: z.string().nullable(),
    verificationUrls: z.record(z.string().url()),
  }),
);

const OAUTH = {
  youtube: {
    url: "https://accounts.google.com/o/oauth2/v2/auth",
    clientId: process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID,
    scopes: ["https://www.googleapis.com/auth/youtube.readonly"],
    verifiedColumn: "youtubeVerifiedAt",
  },
};

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
          Object.entries(OAUTH)
            .filter(
              ([key, data]) =>
                updatedPartner[key] && !updatedPartner[data.verifiedColumn],
            )
            .map(([key, data]) => {
              if (!data.url || !data.clientId) return [key, null];

              return [
                key,
                `${data.url}?${new URLSearchParams({
                  client_id: data.clientId,
                  redirect_uri: `${APP_DOMAIN_WITH_NGROK}/api/partners/online-presence/callback`,
                  scope: data.scopes.join(" "),
                  response_type: "code",
                  state: JSON.stringify({
                    partnerId: partner.id,
                    source: parsedInput.source,
                  }),
                }).toString()}`,
              ];
            }),
        ),
      }),
    };
  });
