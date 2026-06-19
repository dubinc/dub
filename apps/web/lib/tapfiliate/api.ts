import {
  tapfiliateConversionSchema,
  tapfiliateCustomerSchema,
  tapfiliateGroupSchema,
  tapfiliatePartnerSchema,
  tapfiliateProgramSchema,
} from "./schemas";

export class TapfiliateApi {
  private readonly baseUrl = "https://api.tapfiliate.com/1.6";
  private readonly apiKey: string;

  constructor({ apiKey }: { apiKey: string }) {
    this.apiKey = apiKey;
  }

  private async fetch(path: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        "X-Api-Key": this.apiKey,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const error = await response.text();

      console.error("Tapfiliate API Error:", error);

      throw new Error(
        `[Tapfiliate API] ${error || `Request to ${path} failed with status ${response.status}.`}`,
      );
    }

    return await response.json();
  }

  async listPrograms() {
    const data = await this.fetch(`/programs/`);

    return tapfiliateProgramSchema.array().parse(data);
  }

  async getProgram({ programId }: { programId: string }) {
    const data = await this.fetch(`/programs/${programId}/`);

    return tapfiliateProgramSchema.parse(data);
  }

  async listGroups() {
    const data = await this.fetch(`/affiliate-groups/`);

    return tapfiliateGroupSchema.array().parse(data);
  }

  async listPartners({ page = 1 }: { page?: number }) {
    const data = await this.fetch(`/affiliates/?page=${page}`);

    return tapfiliatePartnerSchema.array().parse(data);
  }

  async listCustomers({
    programId,
    page = 1,
  }: {
    programId: string;
    page?: number;
  }) {
    const searchParams = new URLSearchParams({
      program_id: programId,
      page: page.toString(),
    });

    const data = await this.fetch(`/customers?${searchParams.toString()}`);

    return tapfiliateCustomerSchema.array().parse(data);
  }

  // Fetch conversions and commissions
  async listConversions({
    programId,
    page = 1,
  }: {
    programId: string;
    page?: number;
  }) {
    const searchParams = new URLSearchParams({
      program_id: programId,
      page: page.toString(),
    });

    const data = await this.fetch(`/conversions/?${searchParams.toString()}`);

    return tapfiliateConversionSchema.array().parse(data);
  }
}
