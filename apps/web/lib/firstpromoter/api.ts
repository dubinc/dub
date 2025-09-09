import { z } from "zod";
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
    const searchParams = new URLSearchParams({
      per_page: PAGE_LIMIT.toString(),
      ...(page ? { page: page.toString() } : {}),
    });

    const campaigns = await this.fetch(
      `/promoter_campaigns?${searchParams.toString()}`,
    );

    return firstPromoterCampaignSchema.array().parse(campaigns);
  }

  async listPartners({ page }: { page?: number }) {
    const searchParams = new URLSearchParams({
      filters: JSON.stringify({
        archived: false,
        state: "accepted",
        referrals_count: {
          from: 1,
        },
      }),
      per_page: PAGE_LIMIT.toString(),
      ...(page ? { page: page.toString() } : {}),
    });

    const response = await this.fetch(`/promoters?${searchParams.toString()}`);

    const { data: partners } = z
      .object({
        data: firstPromoterPartnerSchema.array(),
      })
      .parse(response);

    return partners;
  }

  async listCustomers({ page }: { page?: number }) {
    const searchParams = new URLSearchParams({
      per_page: PAGE_LIMIT.toString(),
      ...(page ? { page: page.toString() } : {}),
    });

    const customers = await this.fetch(`/referrals?${searchParams.toString()}`);

    return firstPromoterCustomerSchema.array().parse(customers);
  }

  async listCommissions({ page }: { page?: number }) {
    const searchParams = new URLSearchParams({
      per_page: PAGE_LIMIT.toString(),
      ...(page ? { page: page.toString() } : {}),
    });

    const commissions = await this.fetch(
      `/commissions?${searchParams.toString()}`,
    );

    return firstPromoterCommissionSchema.array().parse(commissions);
  }
}
