import { HttpBaseClient } from "@/lib/http/base-client";
import {
  getDomainRatingInputSchema,
  getDomainRatingOutputSchema,
} from "./schema";

class AhrefsClient extends HttpBaseClient {
  protected readonly vendor = "Ahrefs";
  protected readonly baseUrl = "https://api.ahrefs.com/v3/public";

  constructor() {
    super({ timeout: 5_000 });
  }

  protected buildAuthHeaders() {
    return {};
  }

  // GET /v3/public/domain-rating-free
  async getDomainRating(target: string) {
    const data = await this.get("/domain-rating-free", {
      input: {
        target,
        output: "json",
      },
      inputSchema: getDomainRatingInputSchema,
      outputSchema: getDomainRatingOutputSchema,
    });

    return Math.round(data.domain_rating.domain_rating);
  }
}

export const ahrefsClient = new AhrefsClient();
