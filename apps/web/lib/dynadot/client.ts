import { DubApiError } from "@/lib/api/errors";
import { assertEnv } from "@/lib/assert-env";
import { HttpBaseClient } from "@/lib/http/base-client";
import * as z from "zod/v4";
import {
  registerDomainInputSchema,
  registerDomainOutputSchema,
  searchDomainsInputSchema,
  searchDomainsOutputSchema,
  setRenewOptionInputSchema,
  setRenewOptionOutputSchema,
} from "./schema";

class DynadotClient extends HttpBaseClient {
  protected readonly vendor = "Dynadot";
  protected readonly baseUrl =
    process.env.DYNADOT_BASE_URL || "https://api.dynadot.com/api3.json";
  protected readonly redactedQueryParams = ["key"];

  protected buildAuthHeaders() {
    return {};
  }

  protected buildAuthQuery() {
    return {
      key: assertEnv("DYNADOT_API_KEY"),
    };
  }

  protected mapError({
    method,
    url,
    status,
  }: {
    method: string;
    url: string;
    status: number;
    responseBody: string | null;
    data: unknown;
  }) {
    return new DubApiError({
      code: "bad_request",
      message: `[${this.vendor}] ${method} ${url} failed with status ${status}`,
    });
  }

  // GET /api3.json?command=search
  async search(input: z.input<typeof searchDomainsInputSchema>) {
    return await this.get("", {
      input,
      inputSchema: searchDomainsInputSchema,
      outputSchema: searchDomainsOutputSchema,
    });
  }

  // GET /api3.json?command=register
  async register(input: z.input<typeof registerDomainInputSchema>) {
    return await this.get("", {
      input,
      inputSchema: registerDomainInputSchema,
      outputSchema: registerDomainOutputSchema,
    });
  }

  // GET /api3.json?command=set_renew_option
  async setRenewOption(input: z.input<typeof setRenewOptionInputSchema>) {
    return await this.get("", {
      input,
      inputSchema: setRenewOptionInputSchema,
      outputSchema: setRenewOptionOutputSchema,
    });
  }
}

export const dynadotClient = new DynadotClient();
