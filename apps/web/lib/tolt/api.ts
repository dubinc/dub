import { DubApiError } from "@/lib/api/errors";
import {
  ToltAffiliateSchema,
  ToltLinkSchema,
  ToltProgramSchema,
} from "./schemas";
import {
  RewardfulCommission,
  ToltAffiliate,
  ToltLink,
  ToltListResponse,
} from "./types";

const PAGE_LIMIT = 10;

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
      console.error("Tolt API Error:", error);
      throw new ToltApiError(error);
    }

    const data = await response.json();

    return data as T;
  }

  // Since there's no endpoint to fetch a program by ID directly,
  // we'll use the "GET /partners" endpoint with `expand=program`
  async getProgram({ programId }: { programId: string }) {
    const searchParams = new URLSearchParams();
    searchParams.append("program_id", programId);
    searchParams.append("expand[]", "program");
    searchParams.append("limit", "1");

    const { data: partners, total_count } = await this.fetch<
      ToltListResponse<ToltAffiliate>
    >(`${this.baseUrl}/partners?${searchParams.toString()}`);

    if (partners.length === 0) {
      throw new Error("No partners found to import.");
    }

    const partner = partners[0];

    if (!partner.program) {
      throw new Error("No program found for the first partner.");
    }

    return {
      ...ToltProgramSchema.parse({
        ...partner.program,
      }),
      total_affiliates: total_count,
    };
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
    searchParams.append("expand[]", "program");
    searchParams.append("starting_after", startingAfter || "");
    searchParams.append("limit", PAGE_LIMIT.toString());

    const { data, has_more, total_count } = await this.fetch<
      ToltListResponse<ToltAffiliate>
    >(`${this.baseUrl}/partners?${searchParams.toString()}`);

    return {
      has_more,
      total_count,
      data: ToltAffiliateSchema.array().parse(data),
    };
  }

  async listLinks({
    programId,
    startingAfter,
  }: {
    programId: string;
    startingAfter?: string;
  }) {
    const searchParams = new URLSearchParams();
    searchParams.append("program_id", programId);
    searchParams.append("expand[]", "partner");
    searchParams.append("starting_after", startingAfter || "");
    searchParams.append("limit", PAGE_LIMIT.toString());

    const { data, has_more, total_count } = await this.fetch<
      ToltListResponse<ToltLink>
    >(`${this.baseUrl}/links?${searchParams.toString()}`);

    return {
      has_more,
      total_count,
      data: ToltLinkSchema.array().parse(data),
    };
  }

  async listReferrals({
    programId,
    startingAfter,
  }: {
    programId: string;
    startingAfter?: string;
  }) {
    const searchParams = new URLSearchParams();
    searchParams.append("program_id", programId);
    searchParams.append("expand[]", "partner");
    searchParams.append("starting_after", startingAfter || "");
    searchParams.append("limit", PAGE_LIMIT.toString());

    const { data, has_more, total_count } = await this.fetch<
      ToltListResponse<ToltLink>
    >(`${this.baseUrl}/links?${searchParams.toString()}`);

    return {
      has_more,
      total_count,
      data: ToltLinkSchema.array().parse(data),
    };
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
