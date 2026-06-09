import { storage } from "@/lib/storage";
import { Message, MessageAttachment } from "@dub/prisma/client";
import {
  ATTACHMENT_MIME_TYPE_LABELS,
  PREVIEWABLE_IMAGE_TYPES,
} from "../zod/schemas/messages";

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

// Normalize a user-supplied file name
export function sanitizeFileName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[\x00-\x1F\x7F/\\?#%]/g, (ch) => encodeURIComponent(ch));
}

export function getAttachmentTypeLabel(mimeType: string): string {
  return (
    ATTACHMENT_MIME_TYPE_LABELS[mimeType] ||
    mimeType.split("/").pop()?.toUpperCase() ||
    "FILE"
  );
}

export function isPreviewableImageType(mimeType: string): boolean {
  return PREVIEWABLE_IMAGE_TYPES.has(mimeType);
}
