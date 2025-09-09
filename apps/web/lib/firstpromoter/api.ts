import { partnerStackLink } from "../partnerstack/schemas";
import { PAGE_LIMIT } from "./importer";
import {
  firstPromoterCampaignSchema,
  firstPromoterCommissionSchema,
  firstPromoterCustomerSchema,
  firstPromoterPartnerSchema,
} from "./schemas";

export class FirstPromoterApi {
  private readonly baseUrl = "https://v2.firstpromoter.com/api/v2/company";
  private readonly apiKey: string;
  private readonly accountId: string;

  constructor({ apiKey, accountId }: { apiKey: string; accountId: string }) {
    this.apiKey = apiKey;
    this.accountId = accountId;
  }

  private async fetch<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "ACCOUNT-ID": this.accountId,
      },
    });

    if (!response.ok) {
      const error = await response.json();

      console.error("FirstPromoter API Error:", error);

      throw new Error(error.message || "Unknown error from FirstPromoter API.");
    }

    return await response.json();
  }

  async testConnection() {
    try {
      await this.fetch("/promoter_campaigns?page=1&per_page=1");
      return true;
    } catch (error) {
      throw new Error("Invalid FirstPromoter API token.");
    }
  }

  async listCampaigns({ page }: { page?: number }) {
    const params: Record<string, string> = {
      per_page: PAGE_LIMIT.toString(),
      ...(page ? { page: page.toString() } : {}),
    };

    const searchParams = new URLSearchParams(params);

    const campaigns = await this.fetch(
      `/promoter_campaigns?${searchParams.toString()}`,
    );

    return firstPromoterCampaignSchema.array().parse(campaigns);
  }

  async listPartners({
    campaignId,
    page,
  }: {
    campaignId: string;
    page?: number;
  }) {
    const filters = {
      campaign_id: campaignId,
      archived: false,
    };

    const params: Record<string, string> = {
      filters: JSON.stringify(filters),
      per_page: PAGE_LIMIT.toString(),
      ...(page ? { page: page.toString() } : {}),
    };

    const searchParams = new URLSearchParams(params);

    const partners = await this.fetch(`/promoters?${searchParams.toString()}`);

    return firstPromoterPartnerSchema.array().parse(partners);
  }

  // TODO:
  // Fix this
  async listLinks({ identifier }: { identifier: string }) {
    const links = await this.fetch(`/links/partnership/${identifier}`);

    return partnerStackLink.array().parse(links);
  }

  async listCustomers({ page }: { page?: number }) {
    const params: Record<string, string> = {
      per_page: PAGE_LIMIT.toString(),
      ...(page ? { page: page.toString() } : {}),
    };

    const searchParams = new URLSearchParams(params);

    const customers = await this.fetch(`/referrals?${searchParams.toString()}`);

    return firstPromoterCustomerSchema.array().parse(customers);
  }

  async listCommissions({ page }: { page?: number }) {
    const params: Record<string, string> = {
      per_page: PAGE_LIMIT.toString(),
      ...(page ? { page: page.toString() } : {}),
    };

    const searchParams = new URLSearchParams(params);

    const commissions = await this.fetch(
      `/commissions?${searchParams.toString()}`,
    );

    return firstPromoterCommissionSchema.array().parse(commissions);
  }
}
