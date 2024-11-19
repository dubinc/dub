import { prisma } from "@/lib/prisma";
import { nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { DubApiError } from "../api/errors";
import { ratelimit } from "../upstash";
import {
  EMBED_PUBLIC_TOKEN_EXPIRY,
  EMBED_PUBLIC_TOKEN_LENGTH,
} from "./constants";

export const createReferralPublicToken = async ({
  linkId,
  workspaceId,
}: {
  linkId: string;
  workspaceId: string;
}) => {
  const link = await prisma.link.findUniqueOrThrow({
    where: {
      id: linkId,
      projectId: workspaceId,
    },
  });

  if (!link.trackConversion) {
    throw new DubApiError({
      code: "forbidden",
      message: "Conversion tracking is not enabled for this link.",
    });
  }

  const { success } = await ratelimit(10, "1 m").limit(linkId);

  if (!success) {
    throw new DubApiError({
      code: "rate_limit_exceeded",
      message: "Too many requests.",
    });
  }

  const token = await prisma.embedPublicToken.findFirst({
    where: {
      linkId,
      expires: {
        gt: new Date(),
      },
    },
  });

  if (token) {
    return token;
  }

  // Remove all expired tokens for this link
  waitUntil(
    prisma.embedPublicToken.deleteMany({
      where: {
        linkId,
        expires: {
          lte: new Date(),
        },
      },
    }),
  );

  return await prisma.embedPublicToken.create({
    data: {
      linkId,
      expires: new Date(Date.now() + EMBED_PUBLIC_TOKEN_EXPIRY),
      publicToken: nanoid(EMBED_PUBLIC_TOKEN_LENGTH),
    },
  });
};
