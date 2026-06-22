import { storage } from "@/lib/storage";
import { Message, MessageAttachment } from "@prisma/client";

export async function enrichMessage(
  message: Message & { attachments: MessageAttachment[] },
) {
  return {
    ...message,
    attachments: await Promise.all(message.attachments.map(enrichAttachment)),
  };
}

async function enrichAttachment(att: MessageAttachment) {
  return {
    ...att,
    signedUrl: await storage.getSignedDownloadUrl({
      key: att.storageKey,
      bucket: "private",
      expiresIn: 3600,
    }),
  };
}
