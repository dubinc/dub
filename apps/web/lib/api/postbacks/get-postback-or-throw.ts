import { prisma } from "@dub/prisma";
import { DubApiError } from "../errors";

interface GetPostbackOrThrowParams {
  postbackId: string;
  partnerId: string;
}

export const getPostbackOrThrow = async ({
  postbackId,
  partnerId,
}: GetPostbackOrThrowParams) => {
  const postback = await prisma.postback.findUnique({
    where: {
      id: postbackId,
    },
  });

  if (!postback) {
    throw new DubApiError({
      code: "not_found",
      message: "Postback not found.",
    });
  }

  if (postback.partnerId !== partnerId) {
    throw new DubApiError({
      code: "forbidden",
      message: "Postback does not belong to your partner profile.",
    });
  }

  return postback;
};
