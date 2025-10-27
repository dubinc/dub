import { prisma } from "@dub/prisma";
import { DubApiError } from "../errors";

interface GetQrParams {
  qrId: string;
}

export const getQr = async ({ qrId }: GetQrParams) => {
  const qr = await prisma.qr.findUnique({
    where: { id: qrId },
    include: {
      link: true,
      user: true,
      file: true,
    }
  });

  if (!qr) {
    throw new DubApiError({
      code: "not_found",
      message: "Qr not found.",
    });
  }

  return qr;
};
