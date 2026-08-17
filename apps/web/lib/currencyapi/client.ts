import { assertEnv } from "@/lib/assert-env";
import { HttpBaseClient } from "@/lib/http/base-client";
import { getLatestOutputSchema } from "./schema";

class CurrencyApiClient extends HttpBaseClient {
  protected readonly vendor = "CurrencyAPI";
  protected readonly baseUrl = "https://api.currencyapi.com/v3";

  protected buildAuthHeaders() {
    return {
      apikey: assertEnv("CURRENCY_API_KEY"),
    };
  }

  // GET /v3/latest
  async getLatest() {
    return await this.get("/latest", {
      outputSchema: getLatestOutputSchema,
    });
  }
}

export const currencyApiClient = new CurrencyApiClient();
