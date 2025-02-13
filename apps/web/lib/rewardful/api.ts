import { DubApiError } from "@/lib/api/errors";
import {
  RewardfulAffiliate,
  RewardfulCampaign,
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
  private readonly baseUrl = "https://api.getrewardful.com";
  private readonly token: string;

  constructor({ token }: { token: string }) {
    this.token = token;
  }

  private async fetch<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    const data = await response.json();

    console.debug("Rewardful API Response:", { url, data });

    if (!response.ok) {
      throw new RewardfulApiError(data.error);
    }

    return data as T;
  }

  async retrieveCampaign(campaignId: string) {
    return this.fetch<RewardfulCampaign>(
      `${this.baseUrl}/campaigns/${campaignId}`,
    );
  }

  async listCampaigns() {
    return this.fetch<RewardfulCampaign[]>(`${this.baseUrl}/campaigns`);
  }

  async listAffiliates({
    campaignId,
    page = 1,
  }: {
    campaignId: string;
    page?: number;
  }) {
    return this.fetch<RewardfulAffiliate[]>(
      `${this.baseUrl}/affiliates?expand[]=links&page=${page}&limit=${PAGE_LIMIT}&campaign_id=${campaignId}`,
    );
  }

  async listReferrals({ page = 1 }: { page?: number }) {
    const searchParams = new URLSearchParams();
    searchParams.append("expand[]", "affiliate");
    searchParams.append("conversion_state[]", "lead");
    searchParams.append("conversion_state[]", "conversion");
    searchParams.append("page", page.toString());
    searchParams.append("limit", PAGE_LIMIT.toString());

    return this.fetch<RewardfulReferral[]>(
      `${this.baseUrl}/referrals?${searchParams.toString()}`,
    );
  }
}
