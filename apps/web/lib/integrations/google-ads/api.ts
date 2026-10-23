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
  | "conversionDateTime"
  | "eventId"
  | "conversionValue"
  | "currencyCode"
  | "conversionCount"
>;

type GoogleAdsRequestOptions = {
  accessToken: string;
  loginCustomerId?: string | null;
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
      `[Google Ads API] Request failed for ${path} (${response.status}): ${text || "Unknown error"}`,
    );
  }

  if (!response.ok) {
    console.error("[Google Ads API]", path, data);

    throw new Error(
      `[Google Ads API] Request failed for ${path} (${response.status}): ${formatApiErrorDetail(data, text)}`,
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
  const response = await fetch(
    `https://datamanager.googleapis.com/v1/${path}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  const text = await response.text();
  let data: any;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    console.error("[Data Manager API]", path, text);

    throw new Error(
      `[Data Manager API] Request failed for ${path} (${response.status}): ${text || "Unknown error"}`,
    );
  }

  if (!response.ok) {
    console.error("[Data Manager API]", path, data);

    throw new Error(
      `[Data Manager API] Request failed for ${path} (${response.status}): ${formatApiErrorDetail(data, text)}`,
    );
  }

  return data as T;
};

export const formatApiErrorDetail = (data: any, rawText: string) => {
  const payload = Array.isArray(data) ? data[0] : data;
  const adsError = payload?.error?.details?.[0]?.errors?.[0];
  const authorizationError = adsError?.errorCode?.authorizationError;
  const googleAdsError = adsError?.message;

  const detail =
    googleAdsError ??
    payload?.error?.message ??
    (data ? JSON.stringify(data) : rawText);

  if (authorizationError && !String(detail).includes(authorizationError)) {
    return `${authorizationError}: ${detail}`;
  }

  return detail;
};

const normalizeGoogleAdsCustomerId = (customerId: string) =>
  customerId.replace(/-/g, "").replace(/^customers\//, "");

export const isGoogleAdsPermissionDenied = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("USER_PERMISSION_DENIED");
};

type SearchStreamRow = {
  customer?: {
    id?: string | number;
    descriptiveName?: string;
    manager?: boolean;
  };
  conversionAction?: {
    id?: string | number;
    resourceName?: string;
    name?: string;
  };
  customerClient?: {
    id?: string | number;
    resourceName?: string;
    descriptiveName?: string;
    manager?: boolean;
  };
};

const searchStream = async ({
  customerId,
  query,
  ...options
}: GoogleAdsRequestOptions & {
  customerId: string;
  query: string;
}) => {
  const normalizedCustomerId = normalizeGoogleAdsCustomerId(customerId);

  const response = await googleAdsFetch<
    { results?: SearchStreamRow[] }[] | { results?: SearchStreamRow[] }
  >({
    ...options,
    path: `customers/${normalizedCustomerId}/googleAds:searchStream`,
    method: "POST",
    body: { query },
  });

  const batches = Array.isArray(response) ? response : [response];
  return batches.flatMap((batch) => batch.results ?? []);
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
    const customersById = new Map<
      string,
      z.infer<typeof googleAdsCustomerSchema>
    >();

    const toCustomer = ({
      id,
      resourceName,
      descriptiveName,
      manager,
      loginCustomerId,
    }: {
      id: string;
      resourceName?: string;
      descriptiveName?: string;
      manager?: boolean;
      loginCustomerId?: string | null;
    }) => {
      const normalizedId = normalizeGoogleAdsCustomerId(id);

      return googleAdsCustomerSchema.parse({
        id: normalizedId,
        resourceName: resourceName ?? `customers/${normalizedId}`,
        descriptiveName: descriptiveName || `Account ${normalizedId}`,
        manager: manager ?? false,
        loginCustomerId: loginCustomerId ?? (manager ? normalizedId : null),
      });
    };

    const setCustomer = (customer: z.infer<typeof googleAdsCustomerSchema>) => {
      const id = normalizeGoogleAdsCustomerId(customer.id);

      if (!customersById.has(id)) {
        customersById.set(id, customer);
      }
    };

    const fetchCustomer = async ({
      resourceName,
      loginCustomerId,
    }: {
      resourceName: string;
      loginCustomerId?: string | null;
    }) => {
      const customerId = normalizeGoogleAdsCustomerId(resourceName);

      const results = await searchStream({
        ...this.options,
        customerId,
        loginCustomerId,
        query:
          "SELECT customer.id, customer.descriptive_name, customer.manager FROM customer LIMIT 1",
      });

      const customer = results[0]?.customer;

      if (!customer) {
        throw new Error(
          `[Google Ads API] No customer data returned for ${customerId}`,
        );
      }

      const id = customer.id?.toString() ?? customerId;

      return toCustomer({
        id,
        resourceName,
        descriptiveName: customer.descriptiveName,
        manager: customer.manager,
        loginCustomerId: loginCustomerId ?? (customer.manager ? id : null),
      });
    };

    const directResults = await Promise.all(
      resourceNames.map(async (resourceName) => {
        try {
          return {
            resourceName,
            customer: await fetchCustomer({ resourceName }),
          };
        } catch (error) {
          if (!isGoogleAdsPermissionDenied(error)) {
            console.error(
              `[Google Ads API] Failed to fetch customer ${normalizeGoogleAdsCustomerId(resourceName)}`,
              error,
            );
          }

          return {
            resourceName,
            customer: null,
          };
        }
      }),
    );

    for (const { customer } of directResults) {
      if (customer) {
        setCustomer(customer);
      }
    }

    // Only directly accessible managers are valid login-customer-id values.
    const managerAccounts = [...customersById.values()].filter(
      (customer) => customer.manager,
    );

    const failedResourceNames = directResults
      .filter((result) => result.customer === null)
      .map((result) => result.resourceName);

    for (const manager of managerAccounts) {
      const remainingResourceNames = failedResourceNames.filter(
        (resourceName) =>
          !customersById.has(normalizeGoogleAdsCustomerId(resourceName)),
      );

      if (remainingResourceNames.length === 0) {
        break;
      }

      await Promise.all(
        remainingResourceNames.map(async (resourceName) => {
          const customerId = normalizeGoogleAdsCustomerId(resourceName);

          try {
            setCustomer(
              await fetchCustomer({
                resourceName,
                loginCustomerId: manager.id,
              }),
            );
          } catch (error) {
            if (!isGoogleAdsPermissionDenied(error)) {
              console.error(
                `[Google Ads API] Failed to fetch customer ${customerId} with login-customer-id ${manager.id}`,
                error,
              );
            }
          }
        }),
      );
    }

    await Promise.all(
      managerAccounts.map(async (manager) => {
        try {
          const results = await searchStream({
            ...this.options,
            customerId: manager.id,
            loginCustomerId: manager.id,
            query:
              "SELECT customer_client.id, customer_client.descriptive_name, customer_client.manager, customer_client.resource_name FROM customer_client WHERE customer_client.status = ENABLED",
          });

          for (const result of results) {
            const client = result.customerClient;

            if (!client?.id) {
              continue;
            }

            const normalizedId = normalizeGoogleAdsCustomerId(
              client.id.toString(),
            );

            if (customersById.has(normalizedId)) {
              continue;
            }

            setCustomer(
              toCustomer({
                id: normalizedId,
                resourceName: `customers/${normalizedId}`,
                descriptiveName: client.descriptiveName,
                manager: client.manager,
                loginCustomerId: manager.id,
              }),
            );
          }
        } catch (error) {
          console.error(
            `[Google Ads API] Failed to list client accounts for manager ${manager.id}`,
            error,
          );
        }
      }),
    );

    return [...customersById.values()];
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
    conversionCount,
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

    if (conversionCount !== undefined) {
      event.conversionCount = conversionCount;
    }

    return dataManagerFetch<{ requestId: string }>({
      accessToken: this.options.accessToken,
      path: "events:ingest",
      body: {
        destinations: [destination],
        events: [event],
      },
    });
  }
}

// Resolves the login-customer-id header for a selected account.
// Prefers the manager that actually granted access; does not guess a sole MCC
// because that 403s when the client isn't under that manager.
export const inferLoginCustomerId = ({
  customers,
  selectedCustomerId,
}: {
  customers: {
    id: string;
    manager: boolean;
    loginCustomerId?: string | null;
  }[];
  selectedCustomerId: string;
}) => {
  const normalizedSelectedId = selectedCustomerId.replace(/-/g, "");
  const selectedCustomer = customers.find(
    (customer) => customer.id.replace(/-/g, "") === normalizedSelectedId,
  );

  if (!selectedCustomer) {
    return null;
  }

  if (selectedCustomer.loginCustomerId) {
    return selectedCustomer.loginCustomerId.replace(/-/g, "");
  }

  if (selectedCustomer.manager) {
    return normalizedSelectedId;
  }

  return null;
};

// login-customer-id candidates to try when the stored/inferred value 403s.
export const getLoginCustomerIdCandidates = ({
  customers,
  selectedCustomerId,
  loginCustomerId,
}: {
  customers: {
    id: string;
    manager: boolean;
    loginCustomerId?: string | null;
  }[];
  selectedCustomerId: string;
  loginCustomerId?: string | null;
}) => {
  const persistedLoginCustomerId = loginCustomerId?.replace(/-/g, "") || null;

  const managerIds = customers
    .filter((customer) => {
      if (!customer.manager) {
        return false;
      }

      const id = customer.id.replace(/-/g, "");
      const customerLoginCustomerId = customer.loginCustomerId?.replace(
        /-/g,
        "",
      );

      // Sub-managers discovered via hierarchy aren't valid login-customer-ids.
      return !customerLoginCustomerId || customerLoginCustomerId === id;
    })
    .map((customer) => customer.id.replace(/-/g, ""));

  const candidates: (string | null)[] = [
    ...(persistedLoginCustomerId ? [persistedLoginCustomerId] : []),
    inferLoginCustomerId({ customers, selectedCustomerId }),
    null,
    ...managerIds,
  ];

  const seen = new Set<string>();
  const unique: (string | null)[] = [];

  for (const candidate of candidates) {
    const key = candidate ?? "";

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(candidate);
  }

  return unique;
};

// Formats a date as RFC 3339 for Data Manager API event uploads.
const formatGoogleAdsEventTimestamp = (input: string | Date) => {
  const date = typeof input === "string" ? new Date(input) : input;
  return date.toISOString();
};
