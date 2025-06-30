import { DubApiError } from "@/lib/api/errors";
import {
  RewardfulCommission,
  RewardfulReferral,
  ToltAffiliate,
  ToltLink,
  ToltListResponse,
} from "./types";

const PAGE_LIMIT = 100;

class ToltApiError extends DubApiError {
  constructor(message: string) {
    super({
      code: "bad_request",
      message: `[Tolt API] ${message}`,
    });
  }
}

export class ToltApi {
  private readonly baseUrl = "https://api.tolt.com/v1";
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

    if (!response.ok) {
      const error = await response.json();
      console.log("Tolt API Error:", error);
      throw new ToltApiError(error);
    }

    const data = await response.json();

    console.debug("Tolt API Response:", {
      url,
      data: JSON.stringify(data, null, 2),
    });

    return data as T;
  }

  async listAffiliates({
    programId,
    startingAfter,
  }: {
    programId: string;
    startingAfter?: string;
  }) {
    const searchParams = new URLSearchParams();
    searchParams.append("program_id", programId);
    searchParams.append("starting_after", startingAfter || "");
    searchParams.append("limit", PAGE_LIMIT.toString());

    return await this.fetch<ToltListResponse<ToltAffiliate>>(
      `${this.baseUrl}/partners?${searchParams.toString()}`,
    );
  }

  async listLinks({
    programId,
    partnerId,
  }: {
    programId: string;
    partnerId: string;
  }) {
    const searchParams = new URLSearchParams();
    searchParams.append("program_id", programId);
    searchParams.append("partner_id", partnerId);
    searchParams.append("limit", PAGE_LIMIT.toString());

    return await this.fetch<ToltListResponse<ToltLink>>(
      `${this.baseUrl}/links?${searchParams.toString()}`,
    );
  }

  async listReferrals({ page = 1 }: { page?: number }) {
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
}
