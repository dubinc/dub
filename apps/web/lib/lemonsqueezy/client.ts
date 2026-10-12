import { HttpBaseClient } from "@/lib/http/base-client";
import * as z from "zod/v4";
import {
  lemonSqueezyAffiliateSchema,
  lemonSqueezyCustomerSchema,
  lemonSqueezyJsonApiListSchema,
  lemonSqueezyListResourcesInputSchema,
  lemonSqueezyOrderSchema,
  lemonSqueezyStoreSchema,
  lemonSqueezySubscriptionInvoiceSchema,
} from "./schemas";
import {
  LemonSqueezyAffiliate,
  LemonSqueezyCustomer,
  LemonSqueezyJsonApiResource,
  LemonSqueezyOrder,
  LemonSqueezyStore,
  LemonSqueezySubscriptionInvoice,
} from "./types";

const LEMONSQUEEZY_PAGE_SIZE = 100;

function flattenResource<T extends z.ZodType>(
  resource: LemonSqueezyJsonApiResource,
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
  resource: LemonSqueezyJsonApiResource,
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

export class LemonSqueezyClient extends HttpBaseClient {
  protected readonly vendor = "Lemon Squeezy";
  protected readonly baseUrl = "https://api.lemonsqueezy.com/v1";

  private readonly apiKey: string;

  constructor({ apiKey }: { apiKey: string }) {
    super();
    this.apiKey = apiKey;
  }

  protected buildAuthHeaders() {
    return {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${this.apiKey}`,
    };
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
    return await this.get(path, {
      input: {
        "page[number]": page,
        "page[size]": LEMONSQUEEZY_PAGE_SIZE,
        ...(storeId ? { "filter[store_id]": storeId } : {}),
        ...(include ? { include } : {}),
      },
      inputSchema: lemonSqueezyListResourcesInputSchema,
      outputSchema: lemonSqueezyJsonApiListSchema,
    });
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
