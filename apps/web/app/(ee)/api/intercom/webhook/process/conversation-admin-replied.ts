import { createId } from "@/lib/api/create-id";
import { qstash } from "@/lib/cron";
import { decrypt } from "@/lib/encryption";
import { Intercom } from "@/lib/integrations/intercom/client";
import {
  IntercomContact,
  IntercomCredentials,
  intercomCredentialsSchema,
  intercomWebhookSchema,
} from "@/lib/integrations/intercom/schema";
import { prisma } from "@dub/prisma";
import { InstalledIntegration, Prisma, Program } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK, pluralize } from "@dub/utils";
import * as z from "zod/v4";

type Result = {
  message: string;
};

export async function handleConversationAdminReplied({
  data,
  program,
  installation,
}: {
  data: z.infer<typeof intercomWebhookSchema>["data"];
  program: Pick<Program, "id" | "workspaceId">;
  installation: Pick<InstalledIntegration, "credentials" | "userId">;
}): Promise<Result> {
  const credentials = intercomCredentialsSchema.parse(installation.credentials);

  const partners = await identifyPartnersFromContacts({
    contacts: data.item.contacts.contacts,
    program,
    credentials,
  });

  if (partners.length === 0) {
    return {
      message: `No partners found for ${pluralize("contact", data.item.contacts.contacts.length)} ${data.item.contacts.contacts.map((contact) => contact.id).join(", ")}. Skipping message forwarding.`,
    };
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

  // This should never happen
  if (workspaceUsers.length === 0) {
    return {
      message: "No workspace users found.",
    };
  }

  const { conversation_parts: conversations } = data.item.conversation_parts;
  const messagesToCreate: Prisma.MessageCreateManyInput[] = [];

  for (const { body, attachments, author } of conversations) {
    let originalMessage = body.replaceAll(/\[(Image|Attachment|GIF)\]/g, "");

    if (attachments.length > 0) {
      originalMessage += `\n\n${attachments.map((attachment) => attachment.url).join(", ")}`;
    }

    if (originalMessage.trim() === "") {
      continue;
    }

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

    messagesToCreate.push(
      ...partners.map(({ partnerId }) => ({
        id: createId({ prefix: "msg_" }),
        programId: program.id,
        partnerId,
        senderUserId: workspaceUser.userId,
        text: originalMessage,
      })),
    );
  }

  await prisma.message.createMany({
    data: messagesToCreate,
  });

  await Promise.all(
    messagesToCreate.map((message) =>
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

  return {
    message: `Message forwarded to ${pluralize("partner", partners.length)}.`,
  };
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
