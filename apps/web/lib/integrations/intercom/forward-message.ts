import { decrypt } from "@/lib/encryption";
import { redis } from "@/lib/upstash";
import {
  InstalledIntegration,
  Message,
  Partner,
  Program,
  User,
} from "@dub/prisma/client";
import { Intercom } from "./client";
import { intercomCredentialsSchema } from "./schema";

export async function forwardPartnerMessageToIntercom({
  program,
  partner,
  message,
  intercomInstallation,
}: {
  program: Pick<Program, "id" | "workspaceId">;
  partner: Pick<Partner, "id" | "email" | "name" | "image">;
  message: Pick<Message, "id" | "text">;
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
  const redisKey = `intercom:thread:${program.id}:${partner.id}`;
  let conversationId = await redis.get<string>(redisKey);

  // If no conversation exists, create a new one
  // and store the conversation ID in Redis for future use
  if (!conversationId) {
    const conversation = await intercom.createConversation({
      contact,
      message,
    });

    conversationId = conversation.conversation_id;

    await redis.set(redisKey, conversationId);

    return;
  }

  // If a conversation exists, reply to it
  await intercom.sendMessageAsContact({
    contact,
    message,
    conversation: {
      id: conversationId,
    },
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
  const redisKey = `intercom:thread:${program.id}:${partner.id}`;
  let conversationId = await redis.get<string>(redisKey);

  if (!conversationId) {
    const conversation = await intercom.sendMessageAsAdmin({
      admin,
      contact,
      message,
    });

    conversationId = conversation.conversation_id;

    await redis.set(redisKey, conversationId);

    return;
  }

  await intercom.replyAsAdmin({
    admin,
    message,
    conversation: {
      id: conversationId,
    },
  });
}
