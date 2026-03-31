import { DubApiError } from "@/lib/api/errors";
import {
  RewardfulAffiliate,
  RewardfulCampaign,
  RewardfulCommission,
  RewardfulCoupon,
  RewardfulReferral,
} from "./types";

const PAGE_LIMIT = 100;

class RewardfulApiError extends DubApiError {
  constructor(message: string) {
    super({
      code: "bad_request",
      message: `[Rewardful API] ${message}`,
    });
  }
}

export class RewardfulApi {
  private readonly baseUrl = "https://api.getrewardful.com/v1";
  private readonly token: string;

  constructor({ token }: { token: string }) {
    this.token = token;
  }

  private async fetch<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.token}:`).toString("base64")}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.log("Rewardful API Error:", error);
      throw new RewardfulApiError(error);
    }

    const data = await response.json();

    return data as T;
  }

  async listCampaigns() {
    const { data } = await this.fetch<{ data: RewardfulCampaign[] }>(
      `${this.baseUrl}/campaigns`,
    );

    return data;
  }

  async listPartners({ page = 1 }: { page?: number }) {
    const searchParams = new URLSearchParams();
    searchParams.append("expand[]", "campaign");
    searchParams.append("expand[]", "links");
    searchParams.append("page", page.toString());
    searchParams.append("limit", PAGE_LIMIT.toString());

    const { data } = await this.fetch<{ data: RewardfulAffiliate[] }>(
      `${this.baseUrl}/affiliates?${searchParams.toString()}`,
    );

    return data;
  }

  async listCustomers({ page = 1 }: { page?: number }) {
    const searchParams = new URLSearchParams();
    searchParams.append("expand[]", "affiliate");
    searchParams.append("conversion_state[]", "lead");
    searchParams.append("conversion_state[]", "conversion");
    searchParams.append("page", page.toString());
    searchParams.append("limit", PAGE_LIMIT.toString());

    const { data } = await this.fetch<{ data: RewardfulReferral[] }>(
      `${this.baseUrl}/referrals?${searchParams.toString()}`,
    );

    return data;
  }

  async listCommissions({ page = 1 }: { page?: number }) {
    const searchParams = new URLSearchParams();
    searchParams.append("expand[]", "sale");
    searchParams.append("expand[]", "campaign");
    searchParams.append("page", page.toString());
    searchParams.append("limit", PAGE_LIMIT.toString());

    const { data } = await this.fetch<{ data: RewardfulCommission[] }>(
      `${this.baseUrl}/commissions?${searchParams.toString()}`,
    );

    return data;
  }

  async listAffiliateCoupons({ page = 1 }: { page?: number }) {
    const searchParams = new URLSearchParams();
    searchParams.append("page", page.toString());
    searchParams.append("limit", PAGE_LIMIT.toString());

    const { data } = await this.fetch<{ data: RewardfulCoupon[] }>(
      `${this.baseUrl}/affiliate_coupons?${searchParams.toString()}`,
    );

    return data;
  }
}
