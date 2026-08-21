import { sortMessageAttachments } from "@/lib/messages/utils";
import { storage } from "@/lib/storage";
import { Message, MessageAttachment } from "@prisma/client";

export async function enrichMessage(
  message: Message & { attachments: MessageAttachment[] },
) {
  const attachments = sortMessageAttachments(message.attachments);

  return {
    ...message,
    attachments: await Promise.all(attachments.map(enrichAttachment)),
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
