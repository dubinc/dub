import { createId } from "@/lib/api/create-id";
import { qstash } from "@/lib/cron";
import { decrypt } from "@/lib/encryption";
import { Intercom } from "@/lib/integrations/intercom/client";
import {
  IntercomAttachment,
  IntercomContact,
  IntercomCredentials,
  intercomCredentialsSchema,
  intercomWebhookSchema,
} from "@/lib/integrations/intercom/schema";
import { PROGRAM_ALLOWED_ATTACHMENT_TYPES } from "@/lib/messages/constants";
import { sanitizeFileName } from "@/lib/messages/utils";
import { storage } from "@/lib/storage";
import { prisma } from "@dub/prisma";
import {
  InstalledIntegration,
  Message,
  MessageAttachment,
  Program,
} from "@dub/prisma/client";
import {
  APP_DOMAIN_WITH_NGROK,
  fetchWithTimeout,
  nanoid,
  pluralize,
} from "@dub/utils";
import * as z from "zod/v4";

export async function handleConversationAdminReplied({
  data,
  program,
  installation,
}: {
  data: z.infer<typeof intercomWebhookSchema>["data"];
  program: Pick<Program, "id" | "workspaceId">;
  installation: Pick<InstalledIntegration, "credentials" | "userId">;
}): Promise<string> {
  const credentials = intercomCredentialsSchema.parse(installation.credentials);

  const partners = await identifyPartnersFromContacts({
    contacts: data.item.contacts.contacts,
    program,
    credentials,
  });

  if (partners.length === 0) {
    return `No partners found for ${pluralize("contact", data.item.contacts.contacts.length)} ${data.item.contacts.contacts.map((contact) => contact.id).join(", ")}. Skipping message forwarding.`;
  }

  const workspaceUsers = await prisma.projectUsers.findMany({
    where: {
      projectId: program.workspaceId,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  if (workspaceUsers.length === 0) {
    return "No workspace users found.";
  }

  const { conversation_parts: conversations } = data.item.conversation_parts;
  const createdMessages: Pick<Message, "id" | "programId" | "partnerId">[] = [];

  for (const {
    body,
    attachments,
    author,
    app_package_code: appPackageCode,
  } of conversations) {
    // Skip parts created via the Intercom API (e.g. messages we forward from
    // partners back into Intercom) to avoid echoing them back to partners.
    if (appPackageCode) {
      continue;
    }

    let originalMessage = body.replaceAll(/\[(Image|Attachment|GIF)\]/g, "");

    // Nothing to forward: no text and no attachments
    if (attachments.length === 0 && originalMessage.trim() === "") {
      continue;
    }

    // Resolve the sender before doing any upload work
    let workspaceUser = workspaceUsers.find(
      ({ user }) => user.email === author.email,
    );

    if (!workspaceUser) {
      // Fallback to the person who installed the integration
      workspaceUser = workspaceUsers.find(
        ({ user }) => user.id === installation.userId,
      );

      // Fallback to the first owner
      if (!workspaceUser) {
        workspaceUser = workspaceUsers.find(({ role }) => role === "owner");
      }

      if (!workspaceUser) {
        continue;
      }
    }

    // Download Intercom attachments and store them in the private R2 bucket
    const { storedAttachments, externalAttachments } =
      await uploadIntercomAttachments({
        attachments,
        programId: program.id,
      });

    // Graceful degradation: only append the URLs we couldn't store
    if (externalAttachments.length > 0) {
      originalMessage += `\n\n${externalAttachments.map((attachment) => `[${attachment.name}](${attachment.url})`).join(", ")}`;
    }

    // Keep the part if it has text or at least one stored attachment
    if (originalMessage.trim() === "" && storedAttachments.length === 0) {
      continue;
    }

    for (const { partnerId } of partners) {
      const messageId = createId({ prefix: "msg_" });

      await prisma.message.create({
        data: {
          id: messageId,
          programId: program.id,
          partnerId,
          senderUserId: workspaceUser.userId,
          text: originalMessage,
          ...(storedAttachments.length > 0 && {
            attachments: {
              create: storedAttachments.map((attachment) => ({
                id: createId({ prefix: "msa_" }),
                storageKey: attachment.storageKey,
                name: attachment.name,
                size: attachment.size,
                type: attachment.type,
              })),
            },
          }),
        },
      });

      createdMessages.push({
        id: messageId,
        programId: program.id,
        partnerId,
      });
    }
  }

  await Promise.all(
    createdMessages.map((message) =>
      qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/messages/notify-partner`,
        delay: 60 * 3, // 3 minute delay for a chance to read + batching multiple messages
        deduplicationId: `${message.programId}-${message.partnerId}`,
        body: {
          programId: message.programId,
          partnerId: message.partnerId,
          lastMessageId: message.id,
        },
      }),
    ),
  );

  return `Message forwarded to ${pluralize("partner", partners.length)}.`;
}

// Identify partner from Intercom contact ID
async function identifyPartnersFromContacts({
  contacts,
  program,
  credentials,
}: {
  contacts: IntercomContact[];
  program: Pick<Program, "id">;
  credentials: IntercomCredentials;
}): Promise<{ partnerId: string }[]> {
  const intercom = new Intercom({
    token: decrypt(credentials.accessToken),
  });

  const emailAddresses: string[] = [];

  for (const contact of contacts) {
    const contactFound = await intercom.getContactById(contact.id);

    if (!contactFound || !contactFound.email) {
      continue;
    }

    emailAddresses.push(contactFound.email.toLowerCase());
  }

  if (emailAddresses.length === 0) {
    return [];
  }

  const partners = await prisma.partner.findMany({
    where: {
      email: {
        in: emailAddresses,
      },
    },
    select: {
      id: true,
    },
  });

  if (partners.length === 0) {
    return [];
  }

  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      programId: program.id,
      partnerId: {
        in: partners.map((partner) => partner.id),
      },
    },
    select: {
      partnerId: true,
    },
  });

  return programEnrollments.map(({ partnerId }) => ({ partnerId }));
}

// Download Intercom attachments and upload them to the private R2 bucket so they
// can be stored as MessageAttachment rows
async function uploadIntercomAttachments({
  attachments,
  programId,
}: {
  attachments: IntercomAttachment[];
  programId: string;
}) {
  const storedAttachments: Pick<
    MessageAttachment,
    "name" | "type" | "size" | "storageKey"
  >[] = [];

  const externalAttachments: { name: string; url: string }[] = [];

  for (const attachment of attachments) {
    try {
      const response = await fetchWithTimeout(
        attachment.url,
        {
          redirect: "error",
        },
        30000,
      );

      if (
        !PROGRAM_ALLOWED_ATTACHMENT_TYPES.includes(
          attachment.content_type as (typeof PROGRAM_ALLOWED_ATTACHMENT_TYPES)[number],
        )
      ) {
        throw new Error(
          `Unsupported attachment type: ${attachment.content_type}`,
        );
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch attachment: ${response.status}`);
      }

      const blob = await response.blob();

      const name = (attachment.name.trim() || "attachment").slice(0, 191);
      const storageKey = `messages/${programId}/${nanoid(10)}/${sanitizeFileName(name)}`;

      await storage.upload({
        key: storageKey,
        body: blob,
        bucket: "private",
        opts: {
          contentType: attachment.type,
        },
      });

      storedAttachments.push({
        name: attachment.name?.trim() || "attachment",
        type: attachment.content_type,
        size: attachment.filesize,
        storageKey,
      });
    } catch (error) {
      console.error(
        `[Intercom] Failed to store attachment ${attachment.url}`,
        error,
      );

      externalAttachments.push({
        name: attachment.name?.trim() || "attachment",
        url: attachment.url,
      });
    }
  }

  return {
    storedAttachments,
    externalAttachments,
  };
}
