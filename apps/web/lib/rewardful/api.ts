import { DubApiError } from "@/lib/api/errors";
import { redis } from "@/lib/upstash";
import { Campaign, RewardfulAffiliate, RewardfulReferral } from "./types";

class RewardfulApiError extends DubApiError {
  constructor(message: string) {
    super({
      code: "bad_request",
      message: `[Rewardful API] ${message}`,
    });
  }
}

interface ImportConfig {
  apiKey: string;
  campaignId: string;
  userId: string;
}

export async function getImportConfig(programId: string) {
  const config = await redis.get(`rewardful:import:${programId}`);

  if (!config) {
    throw new Error("Rewardful import data not found.", {
      cause: {
        programId,
      },
    });
  }

  return config as ImportConfig;
}

export class RewardfulApi {
  private readonly programId: string; // Dub program id
  // private readonly baseUrl = "https://api.getrewardful.com/v1";
  private readonly baseUrl = "http://api.localhost:8888/api/rewardful";

  constructor({ programId }: { programId: string }) {
    this.programId = programId;
  }

  private async getAuthHeader() {
    const { apiKey } = await getImportConfig(this.programId);

    return {
      Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
    };
  }

  private async fetch<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      headers: await this.getAuthHeader(),
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
    return this.fetch<Campaign[]>(`${this.baseUrl}/campaigns`);
  }

  // Retrieve campaign
  async retrieveCampaign(campaignId: string) {
    return this.fetch<Campaign>(`${this.baseUrl}/campaigns/${campaignId}`);
  }

  // List all affiliates
  async listAffiliates({ page = 1 }: { page?: number }) {
    return this.fetch<RewardfulAffiliate[]>(
      `${this.baseUrl}/affiliates?expand[]=links&page=${page}&limit=100`,
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
