import { prisma } from "@/lib/prisma";
import { nanoid } from "@dub/utils";
import { DubApiError } from "../api/errors";
import {
  REFERRAL_PUBLIC_TOKEN_EXPIRY,
  REFERRAL_PUBLIC_TOKEN_LENGTH,
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

  return await prisma.referralPublicToken.create({
    data: {
      linkId,
      expires: new Date(Date.now() + REFERRAL_PUBLIC_TOKEN_EXPIRY),
      publicToken: nanoid(REFERRAL_PUBLIC_TOKEN_LENGTH),
    },
  });
};
