import { storage } from "@/lib/storage";
import { prisma } from "@dub/prisma";
import { deleteLink } from "../links";
import { getQr } from "./get-qr";

export async function deleteQr(qrId: string) {
  const qr = await getQr({
    qrId,
  });

  if (qr.fileId) {
    await storage.delete(`qrs-content/${qr.fileId}`);
  }

  await prisma.qr.delete({
    where: {
      id: qr.id,
    },
  });

  if (qr.linkId) {
    await deleteLink(qr.linkId);
  }

  return qr;
}
