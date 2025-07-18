import {
  ToltAffiliateSchema,
  ToltCommissionSchema,
  ToltCustomerSchema,
  ToltLinkSchema,
  ToltProgramSchema,
} from "./schemas";
import {
  ToltAffiliate,
  ToltCommission,
  ToltCustomer,
  ToltLink,
  ToltListResponse,
} from "./types";

const PAGE_LIMIT = 100;

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
      throw new Error(error.message || "Unknown error from Tolt API.");
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
      affiliates: total_count,
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
    searchParams.append("limit", PAGE_LIMIT.toString());

    if (startingAfter) {
      searchParams.append("starting_after", startingAfter);
    }

    const { data } = await this.fetch<ToltListResponse<ToltAffiliate>>(
      `${this.baseUrl}/partners?${searchParams.toString()}`,
    );

    return ToltAffiliateSchema.array().parse(data);
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
    searchParams.append("limit", PAGE_LIMIT.toString());

    if (startingAfter) {
      searchParams.append("starting_after", startingAfter);
    }

    const { data } = await this.fetch<ToltListResponse<ToltLink>>(
      `${this.baseUrl}/links?${searchParams.toString()}`,
    );

    return ToltLinkSchema.array().parse(data);
  }

  async listCustomers({
    programId,
    startingAfter,
  }: {
    programId: string;
    startingAfter?: string;
  }) {
    const searchParams = new URLSearchParams();
    searchParams.append("program_id", programId);
    searchParams.append("expand[]", "partner");
    searchParams.append("limit", PAGE_LIMIT.toString());

    if (startingAfter) {
      searchParams.append("starting_after", startingAfter);
    }

    // This might be an issue with the Tolt response, the response is within data.data for this endpoint
    const { data } = await this.fetch<{ data: { data: ToltCustomer[] } }>(
      `${this.baseUrl}/customers?${searchParams.toString()}`,
    );

    return ToltCustomerSchema.array().parse(data.data);
  }

  async listCommissions({
    programId,
    startingAfter,
  }: {
    programId: string;
    startingAfter?: string;
  }) {
    const searchParams = new URLSearchParams();
    searchParams.append("program_id", programId);
    searchParams.append("expand[]", "partner");
    searchParams.append("expand[]", "customer");
    searchParams.append("expand[]", "transaction");
    searchParams.append("limit", PAGE_LIMIT.toString());

    if (startingAfter) {
      searchParams.append("starting_after", startingAfter);
    }

    const { data } = await this.fetch<ToltListResponse<ToltCommission>>(
      `${this.baseUrl}/commissions?${searchParams.toString()}`,
    );

    return ToltCommissionSchema.array().parse(data);
  }
}
