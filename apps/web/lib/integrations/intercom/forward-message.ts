import { decrypt } from "@/lib/encryption";
import { redis } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { Message, Partner, Program } from "@dub/prisma/client";
import { INTERCOM_INTEGRATION_ID } from "@dub/utils";
import { Intercom } from "./client";
import { intercomCredentialsSchema } from "./schema";

export async function forwardMessageAsPartner({
  program,
  partner,
  message,
}: {
  program: Pick<Program, "id" | "workspaceId">;
  partner: Pick<Partner, "id" | "email" | "name" | "image">;
  message: Pick<Message, "id" | "text">;
}) {
  if (!partner.email) {
    return;
  }

  const installedIntegration = await prisma.installedIntegration.findFirst({
    where: {
      projectId: program.workspaceId,
      integrationId: INTERCOM_INTEGRATION_ID,
    },
    select: {
      credentials: true,
    },
  });

  if (!installedIntegration) {
    console.log(
      `[Intercom] Installation not found for program ${program.id}. Skipping forward message.`,
    );
    return;
  }

  const parsedCredentials = intercomCredentialsSchema.safeParse(
    installedIntegration.credentials,
  );

  if (!parsedCredentials.success) {
    console.log(
      `[Intercom] Invalid installation credentials for program ${program.id}. Skipping forward message.`,
    );
    return;
  }

  const credentials = parsedCredentials.data;

  const intercom = new Intercom({
    token: decrypt(credentials.accessToken),
  });

  // Find the partner's Intercom contact ID
  const programEnrollment = await prisma.programEnrollment.findUniqueOrThrow({
    where: {
      partnerId_programId: {
        partnerId: partner.id,
        programId: program.id,
      },
    },
    select: {
      intercomContactId: true,
    },
  });

  let contactId = programEnrollment.intercomContactId;

  if (!contactId) {
    const contact = await intercom.createContact(partner);

    if (!contact) {
      console.log(
        `[Intercom] Failed to get or create contact for partner ${partner.id}. Skipping forward message.`,
      );
      return;
    }

    contactId = contact.id;

    await prisma.programEnrollment.update({
      where: {
        partnerId_programId: {
          partnerId: partner.id,
          programId: program.id,
        },
      },
      data: {
        intercomContactId: contact.id,
      },
    });
  }

  if (!contactId) {
    console.log(
      `[Intercom] Failed to get or create contact for partner ${partner.id}. Skipping forward message.`,
    );
    return;
  }

  // Check for an existing conversation
  let conversationId = await redis.get<string>(
    `intercom:thread:${program.id}:${partner.id}`,
  );

  // If no conversation exists, create a new one
  // and store the conversation ID in Redis for future use
  if (!conversationId) {
    const conversation = await intercom.createConversation({
      contactId,
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
    contactId,
    message,
    conversationId,
  });
}
