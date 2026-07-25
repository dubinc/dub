import { HttpBaseClient } from "@/lib/http/base-client";
import {
  tapfiliateConversionSchema,
  tapfiliateCustomerSchema,
  tapfiliateGroupSchema,
  tapfiliateListConversionsInputSchema,
  tapfiliateListCustomersInputSchema,
  tapfiliateListPartnersInputSchema,
  tapfiliatePartnerSchema,
  tapfiliateProgramSchema,
} from "./schemas";

export class TapfiliateClient extends HttpBaseClient {
  protected readonly vendor = "Tapfiliate";
  protected readonly baseUrl = "https://api.tapfiliate.com/1.6";
  protected readonly logResponseBodies = false;

  private readonly apiKey: string;

  constructor({ apiKey }: { apiKey: string }) {
    super();
    this.apiKey = apiKey;
  }

  protected buildAuthHeaders() {
    return {
      "X-Api-Key": this.apiKey,
    };
  }

  // GET /programs/
  async listPrograms() {
    return await this.get("/programs/", {
      outputSchema: tapfiliateProgramSchema.array(),
    });
  }

  // GET /programs/{programId}/
  async getProgram({ programId }: { programId: string }) {
    return await this.get(`/programs/${programId}/`, {
      outputSchema: tapfiliateProgramSchema,
    });
  }

  // GET /affiliate-groups/
  async listGroups() {
    return await this.get("/affiliate-groups/", {
      outputSchema: tapfiliateGroupSchema.array(),
    });
  }

  // GET /affiliates/?page=
  async listPartners({ page = 1 }: { page?: number }) {
    return await this.get("/affiliates/", {
      input: { page },
      inputSchema: tapfiliateListPartnersInputSchema,
      outputSchema: tapfiliatePartnerSchema.array(),
    });
  }

  // GET /customers?program_id=&page=
  async listCustomers({
    programId,
    page = 1,
  }: {
    programId: string;
    page?: number;
  }) {
    return await this.get("/customers", {
      input: {
        program_id: programId,
        page,
      },
      inputSchema: tapfiliateListCustomersInputSchema,
      outputSchema: tapfiliateCustomerSchema.array(),
    });
  }

  // GET /conversions/?program_id=&page=
  async listConversions({
    programId,
    page = 1,
  }: {
    programId: string;
    page?: number;
  }) {
    return await this.get("/conversions/", {
      input: {
        program_id: programId,
        page,
      },
      inputSchema: tapfiliateListConversionsInputSchema,
      outputSchema: tapfiliateConversionSchema.array(),
    });
  }
}
