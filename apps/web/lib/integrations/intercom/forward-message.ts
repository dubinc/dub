import { decrypt } from "@/lib/encryption";
import { storage } from "@/lib/storage";
import { redis } from "@/lib/upstash";
import {
  InstalledIntegration,
  Message,
  MessageAttachment,
  Partner,
  Program,
  User,
} from "@prisma/client";
import { Intercom, IntercomAttachmentFile } from "./client";
import { intercomCredentialsSchema } from "./schema";

export async function forwardPartnerMessageToIntercom({
  program,
  partner,
  message,
  intercomInstallation,
}: {
  program: Pick<Program, "id" | "workspaceId">;
  partner: Pick<Partner, "id" | "email" | "name" | "image">;
  message: Pick<Message, "id" | "text"> & {
    attachments: MessageAttachment[];
  };
  intercomInstallation: Pick<InstalledIntegration, "id" | "credentials"> | null;
}) {
  if (!partner.email) {
    return;
  }

  if (!intercomInstallation) {
    console.log(
      `[Intercom] Installation not found for program ${program.id}. Skipping forward message.`,
    );
    return;
  }

  const credentials = intercomCredentialsSchema.parse(
    intercomInstallation.credentials,
  );

  const intercom = new Intercom({
    token: decrypt(credentials.accessToken),
  });

  const contact = await intercom.getOrCreateContact(partner);
  const redisKey = `intercom:thread:${credentials.appId}:${program.id}:${partner.id}`;
  let conversationId = await redis.get<string>(redisKey);

  const { attachmentUrls, attachmentFiles } = await buildIntercomAttachments(
    message.attachments,
  );

  // If no conversation exists, create a new one
  // and store the conversation ID in Redis for future use
  if (!conversationId) {
    const conversation = await intercom.createConversationAsContact({
      contact,
      message,
      attachmentUrls,
    });

    conversationId = conversation.conversation_id;

    await redis.set(redisKey, conversationId);

    // Conversation creation can't carry non-image files; send any as a follow-up reply
    if (attachmentFiles.length > 0) {
      await intercom.replyAsContact({
        contact,
        message,
        conversation: {
          id: conversationId,
        },
        attachmentFiles,
      });
    }

    return;
  }

  // If a conversation exists, reply to it
  await intercom.replyAsContact({
    contact,
    message,
    conversation: {
      id: conversationId,
    },
    attachmentUrls,
    attachmentFiles,
  });
}

export async function forwardProgramMessageToIntercom({
  program,
  partner,
  message,
  intercomInstallation,
}: {
  program: Pick<Program, "id" | "workspaceId">;
  partner: Pick<Partner, "id" | "email" | "name" | "image">;
  message: Pick<Message, "id" | "text"> & {
    senderUser: Pick<User, "email"> | null;
    attachments: MessageAttachment[];
  };
  intercomInstallation: Pick<InstalledIntegration, "id" | "credentials">;
}) {
  if (!partner.email || !message.senderUser?.email) {
    return;
  }

  const credentials = intercomCredentialsSchema.parse(
    intercomInstallation.credentials,
  );

  const intercom = new Intercom({
    token: decrypt(credentials.accessToken),
  });

  const admin = await intercom.findAdminByEmail(message.senderUser.email);

  if (!admin) {
    console.log(
      `[Intercom] Admin not found for email ${message.senderUser.email}. Skipping forward message.`,
    );
    return;
  }

  const contact = await intercom.getOrCreateContact(partner);
  const redisKey = `intercom:thread:${credentials.appId}:${program.id}:${partner.id}`;
  let conversationId = await redis.get<string>(redisKey);

  const { attachmentUrls, attachmentFiles } = await buildIntercomAttachments(
    message.attachments,
  );

  const hasAttachments =
    attachmentUrls.length > 0 || attachmentFiles.length > 0;

  if (!conversationId) {
    const conversation = await intercom.createConversationAsAdmin({
      admin,
      contact,
      message,
    });

    conversationId = conversation.conversation_id;

    await redis.set(redisKey, conversationId);

    // Conversation creation can't carry non-image files; send them as an attachments-only admin reply
    if (hasAttachments) {
      await intercom.replyAsAdmin({
        admin,
        message: {
          text: "",
        },
        conversation: {
          id: conversationId,
        },
        attachmentUrls,
        attachmentFiles,
      });
    }

    return;
  }

  await intercom.replyAsAdmin({
    admin,
    message,
    conversation: {
      id: conversationId,
    },
    attachmentUrls,
    attachmentFiles,
  });
}

// Prepare Dub message attachments (stored in private R2) for forwarding to Intercom.
// Intercom only honors ONE of attachment_urls / attachment_files per reply — when both
// are present it keeps the URLs and silently drops the files. So we never mix them:
//   - all images → signed URLs (Intercom fetches them; lightweight, and the only form
//                   the create-conversation endpoint accepts)
//   - otherwise  → send everything (images included) inline as base64, so a mixed
//                   image + PDF message delivers both.
async function buildIntercomAttachments(
  attachments: MessageAttachment[],
): Promise<{
  attachmentUrls: string[];
  attachmentFiles: { content_type: string; data: string; name: string }[];
}> {
  const attachmentUrls: string[] = [];
  const attachmentFiles: IntercomAttachmentFile[] = [];

  const allImages = attachments.every((attachment) =>
    attachment.type.startsWith("image/"),
  );

  for (const attachment of attachments) {
    try {
      const signedUrl = await storage.getSignedDownloadUrl({
        key: attachment.storageKey,
        bucket: "private",
        expiresIn: 30 * 60,
      });

      if (allImages) {
        attachmentUrls.push(signedUrl);
        continue;
      }

      const response = await fetch(signedUrl);
      const buffer = Buffer.from(await response.arrayBuffer());

      attachmentFiles.push({
        content_type: attachment.type,
        data: buffer.toString("base64"),
        name: attachment.name,
      });
    } catch (error) {
      console.error(
        `[Intercom] Failed to prepare attachment ${attachment.storageKey} for forwarding`,
        error,
      );
    }
  }

  return {
    attachmentUrls,
    attachmentFiles,
  };
}
