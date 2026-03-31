import { hubSpotContactSchema, hubSpotDealSchema } from "./schema";

type FetchOptions = Omit<RequestInit, "body"> & {
  body?: Record<string, unknown>;
};

export class HubSpotApi {
  private readonly baseUrl = "https://api.hubapi.com/crm/v3";
  private readonly token: string;

  constructor({ token }: { token: string }) {
    this.token = token;
  }

  private async fetch<T>(
    input: string,
    options: FetchOptions = {},
  ): Promise<T> {
    const { body, headers, ...rest } = options;

    const url = `${this.baseUrl}${input}`;

    const fetchOptions: RequestInit = {
      ...rest,
      headers: {
        Authorization: `Bearer ${this.token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    };

    const response = await fetch(url, fetchOptions);
    const result = await response.json();

    if (process.env.NODE_ENV === "development") {
      console.log("[HubSpot] API response", {
        url,
        result,
      });
    }

    if (!response.ok) {
      throw new Error(
        `[HubSpot] ${response.status} ${response.statusText} – ${
          (result as any)?.message || "Unknown error"
        }`,
      );
    }

    return result as T;
  }

  // Get the contact by contact id
  async getContact(contactId: number | string) {
    try {
      const contact = await this.fetch(
        `/objects/contacts/${contactId}?properties=email,firstname,lastname,dub_id,dub_link,dub_partner_email,lifecyclestage`,
      );

      return hubSpotContactSchema.parse(contact);
    } catch (error) {
      console.error(
        `[HubSpot] Failed to retrieve contact ${contactId}: ${error}`,
      );
      return null;
    }
  }

  // Get the deal by deal id
  async getDeal(dealId: number) {
    try {
      const deal = await this.fetch(
        `/objects/0-3/${dealId}?associations=contacts`,
      );

      return hubSpotDealSchema.parse(deal);
    } catch (error) {
      console.error(`[HubSpot] Failed to retrieve deal ${dealId}: ${error}`);
      return null;
    }
  }

  // Update the contact by contact id
  async updateContact({
    contactId,
    properties,
  }: {
    contactId: number | string;
    properties: Record<string, unknown>;
  }) {
    try {
      const result = await this.fetch(`/objects/contacts/${contactId}`, {
        method: "PATCH",
        body: {
          properties,
        },
      });

      return result;
    } catch (error) {
      console.error(
        `[HubSpot] Failed to update contact ${contactId}: ${error}`,
      );
      return null;
    }
  }

  // Create properties
  async createPropertiesBatch({
    objectType,
    properties,
  }: {
    objectType: "0-1" | "0-3";
    properties: Record<string, unknown>[];
  }) {
    try {
      const result = await this.fetch(
        `/properties/${objectType}/batch/create`,
        {
          method: "POST",
          body: {
            inputs: properties,
          },
        },
      );

      return result;
    } catch (error) {
      console.error(`[HubSpot] Failed to create properties: ${error}`);
      return null;
    }
  }
}
