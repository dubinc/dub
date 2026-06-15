import { Message, Partner } from "@dub/prisma/client";
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
      (admin) => admin?.email.toLowerCase() === email.toLowerCase(),
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
      custom_attributes: {
        dubPartnerId: partner.id,
      },
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

  async createConversation({
    contact,
    message,
  }: {
    contact: IntercomContact;
    message: Pick<Message, "text">;
  }) {
    return await this.client.conversations.create({
      from: {
        type: "user",
        id: contact.id,
      },
      body: message.text,
    });
  }

  async sendMessageAsContact({
    message,
    contact,
    conversation,
  }: {
    message: Pick<Message, "text">;
    contact: IntercomContact;
    conversation: IntercomConversation;
  }) {
    return await this.client.conversations.reply({
      conversation_id: conversation.id,
      body: {
        message_type: "comment",
        type: "user",
        intercom_user_id: contact.id,
        body: message.text,
      },
    });
  }

  async sendMessageAsAdmin({
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
  }: {
    admin: IntercomAdmin;
    message: Pick<Message, "text">;
    conversation: IntercomConversation;
  }) {
    return await this.client.conversations.reply({
      conversation_id: conversation.id,
      body: {
        message_type: "comment",
        type: "admin",
        admin_id: admin.id,
        body: message.text,
      },
    });
  }
}
