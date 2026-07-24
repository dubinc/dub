import * as z from "zod/v4";
import {
  lemonSqueezyAffiliateSchema,
  lemonSqueezyCustomerSchema,
  lemonSqueezyJsonApiListSchema,
  lemonSqueezyOrderSchema,
  lemonSqueezyStoreSchema,
  lemonSqueezySubscriptionInvoiceSchema,
} from "./schemas";
import {
  LemonSqueezyAffiliate,
  LemonSqueezyCustomer,
  LemonSqueezyOrder,
  LemonSqueezyStore,
  LemonSqueezySubscriptionInvoice,
} from "./types";

const LEMONSQUEEZY_PAGE_SIZE = 100;

type JsonApiResource = {
  type: string;
  id: string;
  attributes: Record<string, unknown>;
  relationships?: Record<string, unknown>;
};

function flattenResource<T extends z.ZodType>(
  resource: JsonApiResource,
  schema: T,
  extra?: Record<string, unknown>,
): z.infer<T> {
  return schema.parse({
    id: resource.id,
    ...resource.attributes,
    ...extra,
  });
}

function getRelationshipIds(
  resource: JsonApiResource,
  relationshipName: string,
): string[] {
  const relationship = resource.relationships?.[relationshipName] as
    | {
        data?:
          | { type: string; id: string }
          | Array<{ type: string; id: string }>
          | null;
      }
    | undefined;

  if (!relationship?.data) {
    return [];
  }

  if (Array.isArray(relationship.data)) {
    return relationship.data.map((item) => item.id);
  }

  return [relationship.data.id];
}

export class LemonSqueezyApi {
  private readonly baseUrl = "https://api.lemonsqueezy.com/v1";
  private readonly apiKey: string;

  constructor({ apiKey }: { apiKey: string }) {
    this.apiKey = apiKey;
  }

  private async fetch<T>(
    path: string,
    searchParams?: URLSearchParams,
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (searchParams) {
      searchParams.forEach((value, key) => {
        url.searchParams.set(key, value);
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let response: Response;

    try {
      response = await fetch(url.toString(), {
        headers: {
          Accept: "application/vnd.api+json",
          "Content-Type": "application/vnd.api+json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const error = await response.text();
      console.error("Lemon Squeezy API Error:", error);

      const retryAfter = response.headers.get("Retry-After");
      const rateLimitMessage =
        response.status === 429
          ? ` Rate limited.${retryAfter ? ` Retry after ${retryAfter}s.` : ""}`
          : "";

      throw new Error(
        `[Lemon Squeezy API] ${
          error ||
          `Request to ${path} failed with status ${response.status}.${rateLimitMessage}`
        }`,
      );
    }

    return (await response.json()) as T;
  }

  private async listResources({
    path,
    storeId,
    page = 1,
    include,
  }: {
    path: string;
    storeId?: string;
    page?: number;
    include?: string;
  }) {
    const searchParams = new URLSearchParams({
      "page[number]": page.toString(),
      "page[size]": LEMONSQUEEZY_PAGE_SIZE.toString(),
    });

    if (storeId) {
      searchParams.set("filter[store_id]", storeId);
    }

    if (include) {
      searchParams.set("include", include);
    }

    const payload = await this.fetch<unknown>(path, searchParams);
    return lemonSqueezyJsonApiListSchema.parse(payload);
  }

  async listStores(): Promise<LemonSqueezyStore[]> {
    const { data } = await this.listResources({ path: "/stores" });

    return data.map((resource) =>
      flattenResource(resource, lemonSqueezyStoreSchema),
    );
  }

  async listAffiliates({
    storeId,
    page = 1,
  }: {
    storeId: string;
    page?: number;
  }): Promise<LemonSqueezyAffiliate[]> {
    const { data } = await this.listResources({
      path: "/affiliates",
      storeId,
      page,
    });

    return data.map((resource) =>
      flattenResource(resource, lemonSqueezyAffiliateSchema),
    );
  }

  async listCustomers({
    storeId,
    page = 1,
    include,
  }: {
    storeId: string;
    page?: number;
    include?: string;
  }): Promise<LemonSqueezyCustomer[]> {
    const { data } = await this.listResources({
      path: "/customers",
      storeId,
      page,
      include,
    });

    return data.map((resource) =>
      flattenResource(resource, lemonSqueezyCustomerSchema, {
        // When `include=affiliates` (or relationship data is sideloaded),
        // JSON:API puts affiliate refs on relationships.affiliates.data
        affiliate_ids: getRelationshipIds(resource, "affiliates"),
      }),
    );
  }

  async listCustomerAffiliates({
    customerId,
  }: {
    customerId: string;
  }): Promise<LemonSqueezyAffiliate[]> {
    const { data } = await this.listResources({
      path: `/customers/${customerId}/affiliates`,
    });

    return data.map((resource) =>
      flattenResource(resource, lemonSqueezyAffiliateSchema),
    );
  }

  async listOrders({
    storeId,
    page = 1,
  }: {
    storeId: string;
    page?: number;
  }): Promise<LemonSqueezyOrder[]> {
    const { data } = await this.listResources({
      path: "/orders",
      storeId,
      page,
    });

    return data.map((resource) =>
      flattenResource(resource, lemonSqueezyOrderSchema),
    );
  }

  async listSubscriptionInvoices({
    storeId,
    page = 1,
  }: {
    storeId: string;
    page?: number;
  }): Promise<LemonSqueezySubscriptionInvoice[]> {
    const { data } = await this.listResources({
      path: "/subscription-invoices",
      storeId,
      page,
    });

    return data.map((resource) =>
      flattenResource(resource, lemonSqueezySubscriptionInvoiceSchema),
    );
  }
}
