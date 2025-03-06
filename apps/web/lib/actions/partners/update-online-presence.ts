"use server";

import { prisma } from "@dub/prisma";
import { z } from "zod";
import { authUserActionClient } from "../safe-action";

const updateOnlinePresenceSchema = z.object({
  website: z.string().url().optional(),
  instagram: z.string().optional(),
  tiktok: z.string().optional(),
  youtube: z.string().optional(),
  twitter: z.string().optional(),
});

export const updateOnlinePresenceAction = authUserActionClient
  .schema(updateOnlinePresenceSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { user } = ctx;

    const partner = await prisma.partner.findFirst({
      where: {
        users: {
          some: {
            userId: user.id,
          },
        },
      },
    });

    if (!partner) {
      throw new Error("Partner not found");
    }

    const updateData = {
      ...(parsedInput.website !== undefined && {
        website: parsedInput.website,
        websiteVerifiedAt:
          parsedInput.website !== partner.website ? null : undefined,
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

    await prisma.partner.update({
      where: {
        id: partner.id,
      },
      data: updateData,
    });
  });
