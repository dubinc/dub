import { Message, Partner } from "@dub/prisma/client";
import { IntercomClient } from "intercom-client";

interface IntercomContact {
  id: string;
}

interface IntercomConversation {
  id: string;
}

export class Intercom {
  private client: IntercomClient;
  private token: string;

  constructor({ token }: { token: string }) {
    this.client = new IntercomClient({ token });
    this.token = token;
  }

  // Get currently authorised admin
  async getAdmin() {
    const admin = await this.client.admins.identify();

    if (!admin) {
      throw new Error("[Intercom] Failed to identify admin.");
    }

    return admin;
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

  // Create a custom attribute for the partner
  async createCustomAttribute() {
    const response = await fetch(`https://api.intercom.io/data_attributes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Intercom-Version": "2.15",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({
        name: "dubPartnerId",
        description: "Dub Partner ID",
        model: "contact",
        data_type: "string",
      }),
    });

    if (!response.ok) {
      throw new Error("[Intercom] Failed to create custom attribute.");
    }

    return await response.json();
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

  async replyAsContact({
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
}
