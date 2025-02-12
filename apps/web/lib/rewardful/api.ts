import { DubApiError } from "@/lib/api/errors";
import {
  RewardfulAffiliate,
  RewardfulCampaign,
  RewardfulReferral,
} from "./types";

class RewardfulApiError extends DubApiError {
  constructor(message: string) {
    super({
      code: "bad_request",
      message: `[Rewardful API] ${message}`,
    });
  }
}

export class RewardfulApi {
  // private readonly baseUrl = "https://api.getrewardful.com/v1";
  private readonly baseUrl = "http://api.localhost:8888/api/rewardful";
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

  // List all campaigns
  async listCampaigns() {
    return this.fetch<RewardfulCampaign[]>(`${this.baseUrl}/campaigns`);
  }

  // Retrieve campaign
  async retrieveCampaign(campaignId: string) {
    return this.fetch<RewardfulCampaign>(
      `${this.baseUrl}/campaigns/${campaignId}`,
    );
  }

  // List all affiliates
  async listAffiliates({
    page = 1,
    campaignId,
  }: {
    page?: number;
    campaignId: string;
  }) {
    return this.fetch<RewardfulAffiliate[]>(
      `${this.baseUrl}/affiliates?expand[]=links&page=${page}&limit=100&campaign_id=${campaignId}`,
    );
  }

  // List all referrals
  async listReferrals({ page = 1 }: { page?: number }) {
    const searchParams = new URLSearchParams();
    searchParams.append("expand[]", "affiliate");
    searchParams.append("conversion_state[]", "lead");
    searchParams.append("conversion_state[]", "conversion");
    searchParams.append("page", page.toString());
    searchParams.append("limit", "1");

    return this.fetch<RewardfulReferral[]>(
      `${this.baseUrl}/referrals?${searchParams.toString()}`,
    );
  }
}
