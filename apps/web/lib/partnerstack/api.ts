import {
  partnerStackCommission,
  partnerStackCustomer,
  partnerStackGroup,
  partnerStackLink,
  partnerStackPartner,
} from "./schemas";
import {
  PartnerStackCommission,
  PartnerStackCustomer,
  PartnerStackGroup,
  PartnerStackLink,
  PartnerStackListResponse,
  PartnerStackPartner,
} from "./types";

const PAGE_LIMIT = 100;

export class PartnerStackApi {
  private readonly baseUrl = "https://api.partnerstack.com/api/v2";
  private readonly publicKey: string;
  private readonly secretKey: string;

  constructor({
    publicKey,
    secretKey,
  }: {
    publicKey: string;
    secretKey: string;
  }) {
    this.publicKey = publicKey;
    this.secretKey = secretKey;
  }

  private async fetch<T>(path: string): Promise<T> {
    const token = Buffer.from(`${this.publicKey}:${this.secretKey}`).toString(
      "base64",
    );

    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        Authorization: `Basic ${token}`,
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

  async listGroups() {
    const {
      data: { items },
    } =
      await this.fetch<PartnerStackListResponse<PartnerStackGroup>>(
        `/groups?limit=100`,
      );

    return partnerStackGroup.array().parse(items);
  }

  async listPartners({ startingAfter }: { startingAfter?: string }) {
    const searchParams = new URLSearchParams();
    searchParams.append("approved_status", "approved");
    searchParams.append("limit", PAGE_LIMIT.toString());

    if (startingAfter) {
      searchParams.append("starting_after", startingAfter);
    }

    const {
      data: { items },
    } = await this.fetch<PartnerStackListResponse<PartnerStackPartner>>(
      `/partnerships?${searchParams.toString()}`,
    );

    return partnerStackPartner.array().parse(items);
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

  async listCommissions({
    startingAfter,
    status,
  }: {
    startingAfter?: string;
    status?: PartnerStackCommission["reward_status"];
  }) {
    const searchParams = new URLSearchParams();
    searchParams.append("limit", PAGE_LIMIT.toString());

    if (startingAfter) {
      searchParams.append("starting_after", startingAfter);
    }

    if (status) {
      searchParams.append("status", status);
    }

    const {
      data: { items },
    } = await this.fetch<PartnerStackListResponse<PartnerStackCommission>>(
      `/rewards?${searchParams.toString()}`,
    );

    return partnerStackCommission.array().parse(items);
  }
}
