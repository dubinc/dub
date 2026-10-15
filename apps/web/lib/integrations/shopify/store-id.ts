const SHOPIFY_STORE_ID_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.myshopify\.com$/;

// Rejects store IDs that are not a `*.myshopify.com` domain. The store ID is
// used as the Admin API hostname, so anything else could redirect the request.
export function isValidShopifyStoreId(storeId: string): boolean {
  return typeof storeId === "string" && SHOPIFY_STORE_ID_REGEX.test(storeId);
}
