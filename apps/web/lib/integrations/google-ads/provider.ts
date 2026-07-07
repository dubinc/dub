import { installIntegration } from "@/lib/integrations/install";
import {
  InstallationContext,
  IntegrationProvider,
} from "@/lib/integrations/integration-provider";
import { prisma } from "@/lib/prisma";
import { GOOGLE_ADS_INTEGRATION_ID, prettyPrint } from "@dub/utils";
import * as z from "zod/v4";
import {
  DATA_MANAGER_API_VERSION,
  GOOGLE_ADS_API_VERSION,
  GOOGLE_ADS_CURRENCY,
  GOOGLE_ADS_DEFAULT_SETTINGS,
} from "./constants";
import {
  getDataPartnerAccessToken,
  parseServiceAccountKey,
} from "./data-partner-auth";
import { googleAdsEnv } from "./env";
import {
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
  const { project_id: projectId } = parseServiceAccountKey();

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-goog-user-project": projectId,
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

const GOOGLE_ADS_ENV_KEYS = [
  "GOOGLE_ADS_CLIENT_ID",
  "GOOGLE_ADS_CLIENT_SECRET",
  "GOOGLE_ADS_DEVELOPER_TOKEN",
  "GOOGLE_DATA_PARTNER_ACCOUNT_ID",
  "GOOGLE_DATA_PARTNER_SERVICE_ACCOUNT_JSON",
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

    if (parsed.success) {
      return parsed.data;
    }

    // Legacy installations stored encrypted OAuth tokens — only keep partnerLinkName.
    if (raw && typeof raw === "object" && "partnerLinkName" in raw) {
      const legacy = raw as { partnerLinkName?: string };

      return {
        partnerLinkName: legacy.partnerLinkName,
      };
    }

    throw new Error("Invalid Google Ads credentials.");
  }

  serializeCredentials(credentials: Partial<GoogleAdsCredentials>) {
    return googleAdsCredentialsSchema.parse(credentials);
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

  async completeSetup({
    accessToken,
    customerId,
    userId,
    workspaceId,
  }: {
    accessToken: string;
    customerId: string;
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

    const partnerLinkName = await this.replacePartnerLink({
      accessToken,
      customerId,
      existingPartnerLinkName: parsedCredentials?.partnerLinkName,
    });

    const currentSettings = installation?.settings
      ? this.parseSettings(installation.settings)
      : GOOGLE_ADS_DEFAULT_SETTINGS;

    const parsedSettings = googleAdsSettingsSchema.parse({
      ...currentSettings,
      customerId,
    });

    await installIntegration({
      integrationId: GOOGLE_ADS_INTEGRATION_ID,
      userId,
      workspaceId,
      credentials: this.serializeCredentials({ partnerLinkName }),
      settings: parsedSettings,
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

    const dataPartnerAccessToken = await getDataPartnerAccessToken();

    return this.ingestDataManagerEvents(dataPartnerAccessToken, {
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
