import { qstash } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN_WITH_NGROK, GOOGLE_ADS_INTEGRATION_ID } from "@dub/utils";
import * as z from "zod/v4";
import { GOOGLE_ADS_API_VERSION } from "./constants";
import {
  googleAdsConversionActionSchema,
  googleAdsConversionUploadSchema,
  googleAdsCustomerSchema,
} from "./schema";

export type GoogleAdsClickId =
  | { gclid: string }
  | { gbraid: string }
  | { wbraid: string };

type UploadClickConversionParams = {
  customerId: string;
  conversionAction: string;
  googleClickId: GoogleAdsClickId;
} & Pick<
  z.infer<typeof googleAdsConversionUploadSchema>,
  "conversionDateTime" | "eventId" | "conversionValue" | "currencyCode"
>;

type GoogleAdsRequestOptions = {
  accessToken: string;
  loginCustomerId?: string | null;
};

export const queueGoogleAdsConversionUpload = async (
  payload: z.infer<typeof googleAdsConversionUploadSchema>,
) => {
  // TODO:
  // How to optimize this call?

  const installedIntegration = await prisma.installedIntegration.findFirst({
    where: {
      integrationId: GOOGLE_ADS_INTEGRATION_ID,
      projectId: payload.workspaceId,
    },
    select: {
      id: true,
    },
  });

  if (!installedIntegration) {
    return;
  }

  const response = await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/gad/upload-conversion`,
    body: payload,
    retries: 3,
    deduplicationId: `google-ads-${payload.workspaceId}-${payload.eventId}`,
  });

  if (!response.messageId) {
    throw new Error("Failed to queue Google Ads conversion upload");
  }

  return response;
};

const getGoogleAdsHeaders = ({
  accessToken,
  loginCustomerId,
}: GoogleAdsRequestOptions) => {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    "Content-Type": "application/json",
  };

  if (loginCustomerId) {
    headers["login-customer-id"] = loginCustomerId.replace(/-/g, "");
  }

  return headers;
};

const googleAdsFetch = async <T>({
  path,
  method = "GET",
  body,
  ...options
}: GoogleAdsRequestOptions & {
  path: string;
  method?: "GET" | "POST";
  body?: unknown;
}): Promise<T> => {
  const response = await fetch(
    `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/${path}`,
    {
      method,
      headers: getGoogleAdsHeaders(options),
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
  );

  const text = await response.text();
  let data: any;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    console.error("[Google Ads API]", path, text);

    throw new Error(
      `[Google Ads API] Request failed for ${path} (${response.status}). Please try again.`,
    );
  }

  if (!response.ok) {
    console.error("[Google Ads API]", path, data);

    throw new Error(
      `[Google Ads API] Request failed for ${path} (${response.status}). Please try again.`,
    );
  }

  return data as T;
};

const dataManagerFetch = async <T>({
  accessToken,
  path,
  body,
}: {
  accessToken: string;
  path: string;
  body: unknown;
}): Promise<T> => {
  const response = await fetch(`https://datamanager.googleapis.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let data: any;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    console.error("[Data Manager API]", path, text);

    throw new Error(
      `[Data Manager API] Request failed for ${path} (${response.status}). Please try again.`,
    );
  }

  if (!response.ok) {
    console.error("[Data Manager API]", path, data);

    throw new Error(
      `[Data Manager API] Request failed for ${path} (${response.status}). Please try again.`,
    );
  }

  return data as T;
};

const searchStream = async ({
  customerId,
  query,
  ...options
}: GoogleAdsRequestOptions & {
  customerId: string;
  query: string;
}) => {
  const normalizedCustomerId = customerId.replace(/-/g, "");

  const response = await googleAdsFetch<
    {
      results?: {
        customer?: {
          id?: string;
          descriptiveName?: string;
          manager?: boolean;
        };
        conversionAction?: {
          id?: string;
          resourceName?: string;
          name?: string;
        };
      }[];
    }[]
  >({
    ...options,
    path: `customers/${normalizedCustomerId}/googleAds:searchStream`,
    method: "POST",
    body: { query },
  });

  return response.flatMap((batch) => batch.results ?? []);
};

export class GoogleAdsApi {
  constructor(
    private options: GoogleAdsRequestOptions & {
      customerId?: string | null;
    },
  ) {}

  // Lists accounts the OAuth user can access, then hydrates each with name/manager
  // via searchStream. Client accounts under an MCC often need login-customer-id.
  async listAccessibleCustomers() {
    const response = await googleAdsFetch<{
      resourceNames?: string[];
    }>({
      ...this.options,
      path: "customers:listAccessibleCustomers",
    });

    const resourceNames = response.resourceNames ?? [];

    const fetchCustomer = async ({
      resourceName,
      loginCustomerId,
    }: {
      resourceName: string;
      loginCustomerId?: string | null;
    }) => {
      const customerId = resourceName.replace("customers/", "");

      const results = await searchStream({
        ...this.options,
        customerId,
        loginCustomerId,
        query:
          "SELECT customer.id, customer.descriptive_name, customer.manager FROM customer LIMIT 1",
      });

      const customer = results[0]?.customer;

      return googleAdsCustomerSchema.parse({
        id: customer?.id?.toString() ?? customerId,
        resourceName,
        descriptiveName: customer?.descriptiveName ?? `Account ${customerId}`,
        manager: customer?.manager ?? false,
      });
    };

    const initialResults = await Promise.all(
      resourceNames.map(async (resourceName) => {
        try {
          return {
            resourceName,
            customer: await fetchCustomer({ resourceName }),
          };
        } catch (error) {
          console.error(
            `[Google Ads API] Failed to fetch customer ${resourceName.replace("customers/", "")}`,
            error,
          );

          return {
            resourceName,
            customer: null,
          };
        }
      }),
    );

    const managerAccounts = initialResults
      .map((result) => result.customer)
      .filter((customer): customer is z.infer<typeof googleAdsCustomerSchema> =>
        Boolean(customer?.manager),
      );

    const loginCustomerId =
      managerAccounts.length === 1 ? managerAccounts[0].id : null;

    const customers = await Promise.all(
      initialResults.map(async ({ resourceName, customer }) => {
        if (customer) {
          return customer;
        }

        if (!loginCustomerId) {
          return null;
        }

        const customerId = resourceName.replace("customers/", "");

        try {
          return await fetchCustomer({ resourceName, loginCustomerId });
        } catch (error) {
          console.error(
            `[Google Ads API] Failed to fetch customer ${customerId} with login-customer-id ${loginCustomerId}`,
            error,
          );

          return null;
        }
      }),
    );

    // Only keep accounts we could actually read (skip permission-denied ones).
    return customers.filter(
      (customer): customer is z.infer<typeof googleAdsCustomerSchema> =>
        customer !== null,
    );
  }

  async listUploadClickConversionActions(customerId: string) {
    const results = await searchStream({
      ...this.options,
      customerId,
      query:
        "SELECT conversion_action.id, conversion_action.name, conversion_action.resource_name FROM conversion_action WHERE conversion_action.type = UPLOAD_CLICKS AND conversion_action.status = ENABLED",
    });

    const conversionActions = results
      .map((result) => result.conversionAction)
      .filter(
        (
          conversionAction,
        ): conversionAction is NonNullable<typeof conversionAction> =>
          conversionAction != null,
      );

    return conversionActions.map((conversionAction) =>
      googleAdsConversionActionSchema.parse({
        id: conversionAction.id!.toString(),
        resourceName: conversionAction.resourceName!,
        name: conversionAction.name!,
      }),
    );
  }

  // Uploads an offline click conversion via the Data Manager API.
  // New integrations cannot use ConversionUploadService.UploadClickConversions.
  async uploadClickConversion({
    customerId,
    conversionAction,
    googleClickId,
    conversionDateTime,
    conversionValue,
    currencyCode,
    eventId,
  }: UploadClickConversionParams) {
    const normalizedCustomerId = customerId.replace(/-/g, "");
    const conversionActionId = conversionAction.includes("/")
      ? conversionAction.split("/").pop()!
      : conversionAction;

    const destination: Record<string, unknown> = {
      operatingAccount: {
        accountType: "GOOGLE_ADS",
        accountId: normalizedCustomerId,
      },
      productDestinationId: conversionActionId,
    };

    if (this.options.loginCustomerId) {
      destination.loginAccount = {
        accountType: "GOOGLE_ADS",
        accountId: this.options.loginCustomerId.replace(/-/g, ""),
      };
    }

    const event: Record<string, unknown> = {
      eventTimestamp: formatGoogleAdsEventTimestamp(conversionDateTime),
      transactionId: eventId,
      eventSource: "WEB",
      adIdentifiers: googleClickId,
      consent: {
        adUserData: "CONSENT_GRANTED",
      },
    };

    if (conversionValue !== undefined) {
      event.conversionValue = conversionValue;
    }

    if (currencyCode) {
      event.currency = currencyCode.toUpperCase();
    }

    return dataManagerFetch({
      accessToken: this.options.accessToken,
      path: "events:ingest",
      body: {
        destinations: [destination],
        events: [event],
      },
    });
  }
}

// Resolves the login-customer-id header: use the selected account if it's a
// manager, otherwise the sole accessible manager account (or null if ambiguous).
export const inferLoginCustomerId = ({
  customers,
  selectedCustomerId,
}: {
  customers: {
    id: string;
    manager: boolean;
  }[];
  selectedCustomerId: string;
}) => {
  const normalizedSelectedId = selectedCustomerId.replace(/-/g, "");
  const selectedCustomer = customers.find(
    (customer) => customer.id.replace(/-/g, "") === normalizedSelectedId,
  );

  if (selectedCustomer?.manager) {
    return normalizedSelectedId;
  }

  const managerAccounts = customers.filter((customer) => customer.manager);

  if (managerAccounts.length === 1) {
    return managerAccounts[0].id.replace(/-/g, "");
  }

  return null;
};

// Formats a date as RFC 3339 for Data Manager API event uploads.
export const formatGoogleAdsEventTimestamp = (input: string | Date) => {
  const date = typeof input === "string" ? new Date(input) : input;
  return date.toISOString();
};
