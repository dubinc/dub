import { decrypt, encrypt } from "@/lib/encryption";
import { installIntegration } from "@/lib/integrations/install";
import {
  InstallationContext,
  IntegrationProvider,
} from "@/lib/integrations/integration-provider";
import { prisma } from "@/lib/prisma";
import { GOOGLE_ADS_INTEGRATION_ID, prettyPrint } from "@dub/utils";
import { Prisma } from "@prisma/client";
import * as z from "zod/v4";
import {
  DATA_MANAGER_API_VERSION,
  GOOGLE_ADS_API_VERSION,
  GOOGLE_ADS_CURRENCY,
  GOOGLE_ADS_DEFAULT_SETTINGS,
} from "./constants";
import { googleAdsEnv } from "./env";
import {
  GoogleAdsAuthToken,
  googleAdsCredentialsSchema,
  googleAdsSettingsSchema,
  IngestConversionEvent,
  ingestConversionEventSchema,
  IngestDestination,
  IngestEvent,
  IngestEventsResponse,
  PartnerLink,
} from "./schema";

type GoogleAdsCredentials = z.infer<typeof googleAdsCredentialsSchema>;
type GoogleAdsSettings = z.infer<typeof googleAdsSettingsSchema>;

const DATA_PARTNER_TOKEN_BUFFER_MS = 60 * 1000;

let cachedDataPartnerToken: { accessToken: string; expiresAt: number } | null =
  null;

const isDataPartnerAccessTokenValid = (expiresAt: number) => {
  return Date.now() < expiresAt - DATA_PARTNER_TOKEN_BUFFER_MS;
};

// Exchange Dub's data partner refresh token for a Data Manager API access token.
const getDataPartnerAccessToken = async (): Promise<string> => {
  if (
    cachedDataPartnerToken &&
    isDataPartnerAccessTokenValid(cachedDataPartnerToken.expiresAt)
  ) {
    return cachedDataPartnerToken.accessToken;
  }

  const {
    GOOGLE_DATA_PARTNER_REFRESH_TOKEN: refreshToken,
    GOOGLE_ADS_CLIENT_ID: clientId,
    GOOGLE_ADS_CLIENT_SECRET: clientSecret,
  } = requireGoogleAdsEnv();

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      `[Google Ads] Failed to refresh data partner token: ${
        (result as { error?: string }).error || response.statusText
      }`,
    );
  }

  const accessToken = (result as { access_token?: string }).access_token;

  if (!accessToken) {
    throw new Error(
      "[Google Ads] Data partner token response missing access_token.",
    );
  }

  const expiresIn = (result as { expires_in?: number }).expires_in ?? 3600;

  cachedDataPartnerToken = {
    accessToken,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  return accessToken;
};

const fetchGoogleAdsApi = async <T>(
  accessToken: string,
  path: string,
  options: { method?: string; body?: Record<string, unknown> } = {},
): Promise<T> => {
  const { GOOGLE_ADS_DEVELOPER_TOKEN } = requireGoogleAdsEnv();
  const baseUrl = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;
  const url = `${baseUrl}${path}`;
  const { method = "GET", body } = options;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN,
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
};

// Data Manager API — partner links and offline conversion ingest.
const fetchDataManagerApi = async <T>(
  accessToken: string,
  path: string,
  options: { method?: string; body?: Record<string, unknown> } = {},
): Promise<T> => {
  const baseUrl = `https://datamanager.googleapis.com/${DATA_MANAGER_API_VERSION}`;
  const url = `${baseUrl}${path}`;
  const { method = "GET", body } = options;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const result = text ? JSON.parse(text) : {};

  if (process.env.NODE_ENV === "development") {
    console.log("[Google Ads] Data Manager API response", {
      url,
      result: prettyPrint(result),
    });
  }

  if (!response.ok) {
    throw new Error(
      `[Google Ads] Data Manager ${response.status} ${response.statusText} – ${
        (result as { error?: { message?: string } })?.error?.message ||
        JSON.stringify(result)
      }`,
    );
  }

  return result as T;
};

export function isGoogleAdsAuthTokenValid(
  token: Pick<GoogleAdsAuthToken, "created_at" | "expires_in">,
) {
  if (!token.created_at) {
    return false;
  }

  const buffer = 60 * 1000;
  const expiresAt = token.created_at + token.expires_in * 1000;

  return Date.now() < expiresAt - buffer;
}

const GOOGLE_ADS_ENV_KEYS = [
  "GOOGLE_ADS_CLIENT_ID",
  "GOOGLE_ADS_CLIENT_SECRET",
  "GOOGLE_ADS_DEVELOPER_TOKEN",
  "GOOGLE_DATA_PARTNER_ACCOUNT_ID",
  "GOOGLE_DATA_PARTNER_REFRESH_TOKEN",
] as const;

const requireGoogleAdsEnv = () => {
  const missing = GOOGLE_ADS_ENV_KEYS.filter((key) => !googleAdsEnv[key]);

  if (missing.length > 0) {
    throw new Error(
      `[Google Ads] Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  return googleAdsEnv as {
    [K in (typeof GOOGLE_ADS_ENV_KEYS)[number]]: string;
  };
};

class GoogleAdsProvider extends IntegrationProvider<
  GoogleAdsCredentials,
  GoogleAdsSettings
> {
  assertEnv() {
    requireGoogleAdsEnv();
  }

  parseCredentials(raw: unknown): GoogleAdsCredentials {
    const parsed = googleAdsCredentialsSchema.safeParse(raw);

    if (!parsed.success) {
      throw new Error("Invalid Google Ads credentials.");
    }

    const { access_token, refresh_token, ...rest } = parsed.data;

    return {
      ...rest,
      access_token: decrypt(access_token),
      refresh_token: refresh_token ? decrypt(refresh_token) : undefined,
    };
  }

  serializeCredentials(credentials: Partial<GoogleAdsCredentials>) {
    const parsed = googleAdsCredentialsSchema.parse(credentials);

    return {
      ...parsed,
      ...(parsed.access_token
        ? { access_token: encrypt(parsed.access_token) }
        : {}),
      ...(parsed.refresh_token
        ? { refresh_token: encrypt(parsed.refresh_token) }
        : {}),
    };
  }

  parseSettings(raw: unknown): GoogleAdsSettings {
    return googleAdsSettingsSchema.parse(raw ?? {});
  }

  private tryParseCredentials(raw: unknown): GoogleAdsCredentials | undefined {
    try {
      return this.parseCredentials(raw);
    } catch {
      return undefined;
    }
  }

  async install({
    authToken,
    customerIds,
    userId,
    workspaceId,
  }: {
    authToken: GoogleAdsAuthToken;
    customerIds?: string[];
    userId: string;
    workspaceId: string;
  }) {
    this.assertEnv();

    const installation = await prisma.installedIntegration.findUnique({
      where: {
        userId_integrationId_projectId: {
          userId,
          integrationId: GOOGLE_ADS_INTEGRATION_ID,
          projectId: workspaceId,
        },
      },
      select: {
        credentials: true,
        settings: true,
      },
    });

    const parsedCredentials = installation
      ? this.tryParseCredentials(installation.credentials)
      : undefined;

    const storedAuthToken: GoogleAdsAuthToken = {
      ...authToken,
      created_at: authToken.created_at ?? Date.now(),
    };

    const customerId = customerIds?.[0];
    let partnerLinkName: string | undefined;

    // Replace the partner link if a customer ID is provided (eg: on install)
    if (customerId) {
      partnerLinkName = await this.replacePartnerLink({
        accessToken: storedAuthToken.access_token,
        customerId,
        existingPartnerLinkName: parsedCredentials?.partnerLinkName,
      });
    }
    // Delete the partner link if a partner link name is provided (eg: on uninstall or re-install)
    else if (parsedCredentials?.partnerLinkName) {
      await this.deletePartnerLink(parsedCredentials.partnerLinkName);
    }

    const parsedSettings = googleAdsSettingsSchema.safeParse({
      ...GOOGLE_ADS_DEFAULT_SETTINGS,
      customerId,
      ...(customerIds ? { customerIds } : {}),
    });

    if (!parsedSettings.success) {
      throw new Error("[Google Ads] Failed to parse settings.");
    }

    await installIntegration({
      integrationId: GOOGLE_ADS_INTEGRATION_ID,
      userId,
      workspaceId,
      credentials: this.serializeCredentials({
        ...storedAuthToken,
        ...(partnerLinkName ? { partnerLinkName } : {}),
      }),
      settings: parsedSettings.data,
    });
  }

  async uninstall(installation: InstallationContext) {
    this.assertEnv();

    const { partnerLinkName } = this.getCredentials(installation);

    if (partnerLinkName) {
      await this.deletePartnerLink(partnerLinkName);
    }
  }

  // Google Ads API — used only at connect time for listAccessibleCustomers.
  async listAccessibleCustomers(accessToken: string) {
    const { resourceNames } = await fetchGoogleAdsApi<{
      resourceNames?: string[];
    }>(accessToken, "/customers:listAccessibleCustomers");

    return (resourceNames ?? []).map((name) => name.replace("customers/", ""));
  }

  async ingestConversion({
    customerId,
    conversion,
    validateOnly,
  }: {
    customerId: string;
    conversion: IngestConversionEvent;
    validateOnly?: boolean;
  }) {
    const {
      conversionActionId,
      gclid,
      wbraid,
      gbraid,
      conversionValue,
      eventTimestamp,
      transactionId,
    } = ingestConversionEventSchema.parse(conversion);

    const { GOOGLE_DATA_PARTNER_ACCOUNT_ID: dataPartnerAccountId } =
      requireGoogleAdsEnv();

    const accessToken = await getDataPartnerAccessToken();

    return this.ingestDataManagerEvents(accessToken, {
      destinations: [
        {
          operatingAccount: {
            accountId: customerId,
            accountType: "GOOGLE_ADS",
          },
          loginAccount: {
            accountId: dataPartnerAccountId,
            accountType: "DATA_PARTNER",
          },
          productDestinationId: conversionActionId,
        },
      ],
      events: [
        {
          adIdentifiers: {
            ...(gclid ? { gclid } : {}),
            ...(wbraid ? { wbraid } : {}),
            ...(gbraid ? { gbraid } : {}),
          },
          conversionValue,
          currency: GOOGLE_ADS_CURRENCY,
          eventTimestamp,
          transactionId,
          eventSource: "WEBSITE",
        },
      ],
      validateOnly,
    });
  }

  private async createAdvertiserPartnerLink({
    accessToken,
    advertiserCustomerId,
    dataPartnerAccountId,
  }: {
    accessToken: string;
    advertiserCustomerId: string;
    dataPartnerAccountId: string;
  }): Promise<PartnerLink> {
    return await fetchDataManagerApi<PartnerLink>(
      accessToken,
      `/accountTypes/GOOGLE_ADS/accounts/${advertiserCustomerId}/partnerLinks`,
      {
        method: "POST",
        body: {
          owningAccount: {
            accountType: "GOOGLE_ADS",
            accountId: advertiserCustomerId,
          },
          partnerAccount: {
            accountType: "DATA_PARTNER",
            accountId: dataPartnerAccountId,
          },
        },
      },
    );
  }

  private async deleteDataManagerPartnerLink(
    accessToken: string,
    partnerLinkName: string,
  ) {
    await fetchDataManagerApi<Record<string, never>>(
      accessToken,
      `/${partnerLinkName}`,
      {
        method: "DELETE",
      },
    );
  }

  private async ingestDataManagerEvents(
    accessToken: string,
    {
      destinations,
      events,
      validateOnly,
    }: {
      destinations: IngestDestination[];
      events: IngestEvent[];
      validateOnly?: boolean;
    },
  ): Promise<IngestEventsResponse> {
    return await fetchDataManagerApi<IngestEventsResponse>(
      accessToken,
      "/events:ingest",
      {
        method: "POST",
        body: {
          destinations,
          events,
          ...(validateOnly ? { validateOnly: true } : {}),
        },
      },
    );
  }

  async selectCustomerAccount(
    installation: InstallationContext,
    customerId: string,
  ): Promise<Prisma.InputJsonValue> {
    this.assertEnv();

    const { customerIds } = this.getSettings(installation);

    if (customerIds.length === 0) {
      throw new Error(
        "No Google Ads accounts found. Please re-install the integration.",
      );
    }

    if (!customerIds.includes(customerId)) {
      throw new Error("Selected Google Ads account is not accessible.");
    }

    const { googleAdsOAuthProvider } = await import("./oauth");
    const authToken =
      await googleAdsOAuthProvider.refreshTokenForInstallation(installation);

    const parsedCredentials = this.getCredentials(installation);

    const partnerLinkName = await this.replacePartnerLink({
      accessToken: authToken.access_token,
      customerId,
      existingPartnerLinkName: parsedCredentials.partnerLinkName,
    });

    return this.serializeCredentials({
      ...authToken,
      partnerLinkName,
    });
  }

  private async deletePartnerLink(partnerLinkName: string) {
    const accessToken = await getDataPartnerAccessToken();
    await this.deleteDataManagerPartnerLink(accessToken, partnerLinkName);
  }

  private async replacePartnerLink({
    accessToken,
    customerId,
    existingPartnerLinkName,
  }: {
    accessToken: string;
    customerId: string;
    existingPartnerLinkName?: string;
  }) {
    const { GOOGLE_DATA_PARTNER_ACCOUNT_ID: dataPartnerAccountId } =
      requireGoogleAdsEnv();

    if (existingPartnerLinkName) {
      const dataPartnerAccessToken = await getDataPartnerAccessToken();
      await this.deleteDataManagerPartnerLink(
        dataPartnerAccessToken,
        existingPartnerLinkName,
      );
    }

    const partnerLink = await this.createAdvertiserPartnerLink({
      accessToken,
      advertiserCustomerId: customerId,
      dataPartnerAccountId,
    });

    if (!partnerLink.name) {
      throw new Error(
        "[Google Ads] Partner link created without a resource name.",
      );
    }

    return partnerLink.name;
  }
}

export const googleAdsProvider = new GoogleAdsProvider();
