import { GOOGLE_ADS_API_VERSION, prettyPrint } from "@dub/utils";
import { UploadClickConversion } from "./schema";

type ClickConversion = {
  conversionAction: string;
  gclid?: string;
  wbraid?: string;
  gbraid?: string;
  conversionDateTime: string;
  conversionValue: number;
  currencyCode: string;
  orderId?: string;
};

type UploadClickConversionsResponse = {
  // Present when partialFailure is true and at least one conversion failed.
  partialFailureError?: {
    code: number;
    message: string;
    details?: unknown[];
  };
  results?: { gclidDateTimePair?: unknown; conversionAction?: string }[];
};

// Thin wrapper around the Google Ads REST API. `accessToken` is the connected
// user's OAuth token; the developer-token is Dub's (workspace-independent).
// See https://developers.google.com/google-ads/api/rest/overview
export class GoogleAdsApi {
  private readonly baseUrl = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;
  private readonly accessToken: string;
  private readonly loginCustomerId?: string;

  constructor({
    accessToken,
    loginCustomerId,
  }: {
    accessToken: string;
    loginCustomerId?: string;
  }) {
    this.accessToken = accessToken;
    // login-customer-id is the manager account through which the request is made.
    // Falls back to GOOGLE_ADS_LOGIN_CUSTOMER_ID (Dub's manager account) if set.
    this.loginCustomerId =
      loginCustomerId ?? process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
  }

  private async fetch<T>(
    path: string,
    options: { method?: string; body?: Record<string, unknown> } = {},
  ): Promise<T> {
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

    if (!developerToken) {
      throw new Error("[Google Ads] GOOGLE_ADS_DEVELOPER_TOKEN is not set.");
    }

    const url = `${this.baseUrl}${path}`;
    const { method = "GET", body } = options;

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "developer-token": developerToken,
        ...(this.loginCustomerId
          ? { "login-customer-id": this.loginCustomerId }
          : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const result = await response.json();

    if (process.env.NODE_ENV === "development") {
      console.log("[Google Ads] API response", {
        url,
        result: prettyPrint(result),
      });
    }

    if (!response.ok) {
      throw new Error(
        `[Google Ads] ${response.status} ${response.statusText} – ${
          (result as any)?.error?.message || "Unknown error"
        }`,
      );
    }

    return result as T;
  }

  // List the Google Ads customer accounts the authenticated user can access.
  // Returns bare customer IDs (digits only), e.g. ["1234567890"].
  async listAccessibleCustomers(): Promise<string[]> {
    const { resourceNames } = await this.fetch<{ resourceNames?: string[] }>(
      "/customers:listAccessibleCustomers",
    );

    return (resourceNames ?? []).map((name) => name.replace("customers/", ""));
  }

  // Upload offline click conversions for a customer.
  // https://developers.google.com/google-ads/api/samples/upload-offline-conversion
  async uploadClickConversions({
    customerId,
    conversions,
  }: {
    customerId: string;
    conversions: ClickConversion[];
  }): Promise<UploadClickConversionsResponse> {
    return await this.fetch<UploadClickConversionsResponse>(
      `/customers/${customerId}:uploadClickConversions`,
      {
        method: "POST",
        body: {
          conversions,
          partialFailure: true,
        },
      },
    );
  }
}

// Build the conversionAction resource name Google expects from the customer +
// conversion action IDs.
export const buildConversionActionResourceName = ({
  customerId,
  conversionActionId,
}: Pick<UploadClickConversion, "customerId" | "conversionActionId">) =>
  `customers/${customerId}/conversionActions/${conversionActionId}`;
