const SHOPIFY_ADMIN_API_VERSION = "2025-04";

export class ShopifyAdminGraphqlError extends Error {
  constructor(
    public code: string,
    message: string,
    public userErrors?: unknown,
  ) {
    super(message);
  }
}

// TODO:
// Send the error to Axiom

export async function shopifyAdminGraphql<T>({
  shopifyStoreId,
  accessToken,
  query,
  variables,
}: {
  shopifyStoreId: string;
  accessToken: string;
  query: string;
  variables?: Record<string, unknown>;
}): Promise<T> {
  const response = await fetch(
    `https://${shopifyStoreId}/admin/api/${SHOPIFY_ADMIN_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(15_000),
    },
  );

  if (!response.ok) {
    throw new ShopifyAdminGraphqlError(
      response.status === 401 ? "unauthorized" : "http_error",
      `Shopify Admin API error: ${response.status} ${response.statusText}`,
    );
  }

  const json = await response.json();

  if (json.errors?.length) {
    throw new ShopifyAdminGraphqlError(
      "graphql_error",
      json.errors[0].message,
      json.errors,
    );
  }

  return json.data as T;
}
