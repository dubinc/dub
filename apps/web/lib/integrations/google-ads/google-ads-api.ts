import { prettyPrint } from "@dub/utils";
import { GOOGLE_ADS_API_VERSION } from "./constants";
import { googleAdsEnv } from "./env";

// Google Ads API — used only at connect time for listAccessibleCustomers.
export class GoogleAdsApi {
  private readonly baseUrl = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;
  private readonly accessToken: string;

  constructor({ accessToken }: { accessToken: string }) {
    this.accessToken = accessToken;
  }

  private async fetch<T>(
    path: string,
    options: { method?: string; body?: Record<string, unknown> } = {},
  ): Promise<T> {
    if (!googleAdsEnv.GOOGLE_ADS_DEVELOPER_TOKEN) {
      throw new Error("[Google Ads] GOOGLE_ADS_DEVELOPER_TOKEN is not set.");
    }

    const url = `${this.baseUrl}${path}`;
    const { method = "GET", body } = options;

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "developer-token": googleAdsEnv.GOOGLE_ADS_DEVELOPER_TOKEN,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    const result = text ? JSON.parse(text) : {};

    if (process.env.NODE_ENV === "development") {
      console.log("[Google Ads] API response", {
        url,
        result: prettyPrint(result),
      });
    }

    if (!response.ok) {
      throw new Error(
        `[Google Ads] ${response.status} ${response.statusText} – ${
          (result as { error?: { message?: string } })?.error?.message ||
          "Unknown error"
        }`,
      );
    }

    return result as T;
  }

  async listAccessibleCustomers(): Promise<string[]> {
    const { resourceNames } = await this.fetch<{ resourceNames?: string[] }>(
      "/customers:listAccessibleCustomers",
    );

    return (resourceNames ?? []).map((name) => name.replace("customers/", ""));
  }
}
