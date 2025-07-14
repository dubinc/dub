import {
  partnerStackAffiliate,
  partnerStackCustomer,
  partnerStackLink,
} from "./schemas";
import {
  PartnerStackAffiliate,
  PartnerStackCustomer,
  PartnerStackLink,
  PartnerStackListResponse,
} from "./types";

const PAGE_LIMIT = 100;

export class PartnerStackApi {
  private readonly baseUrl = "https://api.partnerstack.com/api/v2";
  private readonly token: string;

  constructor({ token }: { token: string }) {
    this.token = token;
  }

  private async fetch<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();

      console.error("PartnerStack API Error:", error);

      throw new Error(error.message || "Unknown error from PartnerStack API.");
    }

    return await response.json();
  }

  async testConnection() {
    try {
      await this.fetch("/customers?limit=1");
      return true;
    } catch (error) {
      throw new Error("Invalid PartnerStack API token.");
    }
  }

  async listAffiliates({ startingAfter }: { startingAfter?: string }) {
    const searchParams = new URLSearchParams();
    searchParams.append("approved_status", "approved");
    searchParams.append("limit", PAGE_LIMIT.toString());

    if (startingAfter) {
      searchParams.append("starting_after", startingAfter);
    }

    const {
      data: { items },
    } = await this.fetch<PartnerStackListResponse<PartnerStackAffiliate>>(
      `/partnerships?${searchParams.toString()}`,
    );

    return partnerStackAffiliate.array().parse(items);
  }

  async listLinks({ identifier }: { identifier: string }) {
    const {
      data: { items },
    } = await this.fetch<PartnerStackListResponse<PartnerStackLink>>(
      `/links/partnership/${identifier}`,
    );

    return partnerStackLink.array().parse(items);
  }

  async listCustomers({ startingAfter }: { startingAfter?: string }) {
    const searchParams = new URLSearchParams();
    searchParams.append("limit", PAGE_LIMIT.toString());

    if (startingAfter) {
      searchParams.append("starting_after", startingAfter);
    }

    const {
      data: { items },
    } = await this.fetch<PartnerStackListResponse<PartnerStackCustomer>>(
      `/customers?${searchParams.toString()}`,
    );

    return partnerStackCustomer.array().parse(items);
  }
}
