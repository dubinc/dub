import { Message, Partner } from "@prisma/client";
import { IntercomClient } from "intercom-client";

interface IntercomContact {
  id: string;
}

interface IntercomAdmin {
  id: string;
}

interface IntercomConversation {
  id: string;
}

export interface IntercomAttachmentFile {
  content_type: string;
  data: string;
  name: string;
}

export class Intercom {
  private client: IntercomClient;

  constructor({ token }: { token: string }) {
    this.client = new IntercomClient({ token });
  }

  // Get currently authorised admin
  async getAdmin() {
    const admin = await this.client.admins.identify();

    if (!admin) {
      throw new Error("[Intercom] Failed to identify admin.");
    }

    return admin;
  }

  async findAdminByEmail(email: string): Promise<IntercomAdmin | null> {
    const { admins } = await this.client.admins.list();

    const admin = admins?.find(
      (admin) => admin?.email?.toLowerCase() === email.toLowerCase(),
    );

    if (!admin?.id) {
      return null;
    }

    return {
      id: admin.id,
    };
  }

  async searchContactByEmail(email: string) {
    const { data: contacts } = await this.client.contacts.search({
      query: {
        field: "email",
        operator: "=",
        value: email,
      },
    });

    if (contacts.length === 0) {
      return null;
    }

    return contacts[0];
  }

  async getContactById(id: string) {
    return await this.client.contacts.find({
      contact_id: id,
    });
  }

  async createContact(
    partner: Pick<Partner, "id" | "email" | "name" | "image">,
  ) {
    return await this.client.contacts.create({
      name: partner.name,
      email: partner.email!,
      role: "user",
      avatar: partner.image ?? undefined,
    });
  }

  async getOrCreateContact(
    partner: Pick<Partner, "id" | "email" | "name" | "image">,
  ) {
    const contact = await this.searchContactByEmail(partner.email!);

    if (!contact) {
      return await this.createContact(partner);
    }

    return contact;
  }

  async createConversationAsContact({
    contact,
    message,
    attachmentUrls,
  }: {
    contact: IntercomContact;
    message: Pick<Message, "text">;
    attachmentUrls?: string[];
  }) {
    return await this.client.conversations.create({
      from: {
        type: "user",
        id: contact.id,
      },
      body: message.text,
      // The SDK's CreateConversationRequest type omits attachment_urls, but Intercom's
      // API (OpenAPI 2.14) supports it and the SDK sends the request body as-is.
      ...(attachmentUrls?.length && { attachment_urls: attachmentUrls }),
    } as Parameters<IntercomClient["conversations"]["create"]>[0]);
  }

  async replyAsContact({
    message,
    contact,
    conversation,
    attachmentUrls,
    attachmentFiles,
  }: {
    message: Pick<Message, "text">;
    contact: IntercomContact;
    conversation: IntercomConversation;
    attachmentUrls?: string[];
    attachmentFiles?: IntercomAttachmentFile[];
  }) {
    return await this.client.conversations.reply({
      conversation_id: conversation.id,
      body: {
        message_type: "comment",
        type: "user",
        intercom_user_id: contact.id,
        body: message.text,
        attachment_urls: attachmentUrls?.length ? attachmentUrls : undefined,
        attachment_files: attachmentFiles?.length ? attachmentFiles : undefined,
      },
    });
  }

  async createConversationAsAdmin({
    admin,
    contact,
    message,
  }: {
    admin: IntercomAdmin;
    contact: IntercomContact;
    message: Pick<Message, "text">;
  }) {
    return await this.client.messages.create({
      message_type: "inapp",
      body: message.text,
      template: "plain",
      from: {
        type: "admin",
        id: Number(admin.id),
      },
      to: {
        type: "user",
        id: contact.id,
      },
      create_conversation_without_contact_reply: true,
    });
  }

  async replyAsAdmin({
    admin,
    message,
    conversation,
    attachmentUrls,
    attachmentFiles,
  }: {
    admin: IntercomAdmin;
    message: Pick<Message, "text">;
    conversation: IntercomConversation;
    attachmentUrls?: string[];
    attachmentFiles?: IntercomAttachmentFile[];
  }) {
    return await this.client.conversations.reply({
      conversation_id: conversation.id,
      body: {
        message_type: "comment",
        type: "admin",
        admin_id: admin.id,
        body: message.text || undefined,
        attachment_urls: attachmentUrls?.length ? attachmentUrls : undefined,
        attachment_files: attachmentFiles?.length ? attachmentFiles : undefined,
      },
    });
  }
}
