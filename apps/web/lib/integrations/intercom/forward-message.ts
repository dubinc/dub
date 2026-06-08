import { decrypt } from "@/lib/encryption";
import { redis } from "@/lib/upstash";
import {
  InstalledIntegration,
  Message,
  Partner,
  Program,
} from "@dub/prisma/client";
import { Intercom } from "./client";
import { intercomCredentialsSchema } from "./schema";

export async function forwardMessageAsPartner({
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

  // Check for an existing conversation
  let conversationId = await redis.get<string>(
    `intercom:thread:${program.id}:${partner.id}`,
  );

  // If no conversation exists, create a new one
  // and store the conversation ID in Redis for future use
  if (!conversationId) {
    const conversation = await intercom.createConversation({
      contact,
      message,
    });

    conversationId = conversation.conversation_id;

    await redis.set(
      `intercom:thread:${program.id}:${partner.id}`,
      conversationId,
    );

    return;
  }

  // If a conversation exists, reply to it
  await intercom.replyAsContact({
    contact,
    message,
    conversation: {
      id: conversationId,
    },
  });
}
