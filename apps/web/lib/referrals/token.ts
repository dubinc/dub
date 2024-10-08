import { prisma } from "@/lib/prisma";
import { nanoid } from "@dub/utils";
import { DubApiError } from "../api/errors";
import {
  EMBED_PUBLIC_TOKEN_EXPIRY,
  EMBED_PUBLIC_TOKEN_LENGTH,
} from "./constants";

export const createPublicToken = async ({
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

  return await prisma.embedPublicToken.create({
    data: {
      linkId,
      expires: new Date(Date.now() + EMBED_PUBLIC_TOKEN_EXPIRY),
      publicToken: nanoid(EMBED_PUBLIC_TOKEN_LENGTH),
    },
  });
};
