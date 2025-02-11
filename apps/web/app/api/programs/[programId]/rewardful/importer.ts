import { DubApiError } from "@/lib/api/errors";
import { qstash } from "@/lib/cron";
import { redis } from "@/lib/upstash";
import { prisma } from "@dub/prisma";

import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

export class RewardfulImporter {
  constructor(private readonly programId: string) {
    //
  }

  // Start a background job to import the program
  async start({ apiKey, campaignId }: { apiKey: string; campaignId: string }) {
    await redis.set(
      `rewardful:import:${this.programId}`,
      {
        apiKey,
        campaignId,
      },
      {
        ex: 60 * 60 * 24,
      },
    );

    return await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/import/rewardful`,
      body: {
        programId: this.programId,
      },
    });
  }

  // Import the program
  async import() {
    const apiKey = await redis.get(`rewardful:import:${this.programId}`);

    if (!apiKey) {
      throw new Error("Rewardful API key not found.", {
        cause: {
          programId: this.programId,
        },
      });
    }

    const program = await prisma.program.findUnique({
      where: { id: this.programId },
    });
  }
}

export class RewardfulApi {
  private readonly programId: string; // Dub program id
  // private readonly baseUrl = "https://api.getrewardful.com/v1";
  private readonly baseUrl = "http://api.localhost:8888/api/rewardful";

  constructor({ programId }: { programId: string }) {
    this.programId = programId;
  }

  private async fetchApiKey() {
    const apiKey = await redis.get(`rewardful:import:${this.programId}`);

    if (!apiKey) {
      throw new Error("Rewardful API key not found.", {
        cause: {
          programId: this.programId,
        },
      });
    }

    return apiKey;
  }

  private async getAuthHeader() {
    const apiKey = await this.fetchApiKey();

    return {
      Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
    };
  }

  // List all campaigns
  async listCampaigns() {
    const response = await fetch(`${this.baseUrl}/campaigns`, {
      headers: await this.getAuthHeader(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new RewardfulApiError(data.error);
    }

    console.debug("listCampaigns", data);

    return data as Campaign[];
  }

  // Retrieve campaign
  async retrieveCampaign(campaignId: string) {
    const response = await fetch(`${this.baseUrl}/campaigns/${campaignId}`, {
      headers: await this.getAuthHeader(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new RewardfulApiError(data.error);
    }

    console.debug("retrieveCampaign", data);

    return data as Campaign;
  }

  // List all affiliates
  async listAffiliates() {
    const response = await fetch(`${this.baseUrl}/affiliates`, {
      headers: await this.getAuthHeader(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new RewardfulApiError(data.error);
    }

    console.debug("listAffiliates", data);

    return data as Affiliate[];
  }
}

interface Campaign {
  id: string;
  name: string;
  affiliates: number;
  created_at: string;
  updated_at: string;
}

interface Affiliate {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  state: string;
  visitors: number;
  leads: number;
  conversions: number;
  created_at: string;
  updated_at: string;
}

class RewardfulApiError extends DubApiError {
  constructor(message: string) {
    super({
      code: "bad_request",
      message: `[Rewardful API] ${message}`,
    });
  }
}

// - List all campaigns + ask the user to choose one to import. Retrieve it and set their reward types
// - Importing affiliates + their links (we can expand the links prop)
// - Importing referrals
// - creating a customer + lead on Dub, plus a dummy click event
// - connect the referral to the affiliate
// - Nice to have: Import affiliate coupons (and create a Discount on Dub)
