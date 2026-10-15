import { DubApiError } from "@/lib/api/errors";
import { shopifyAdminGraphql } from "./admin-graphql";

// Webhooks are routed by `shopifyStoreId`, so the access token must belong to
// the store before a workspace is allowed to claim it.
export async function verifyShopifyStoreOwnership({
  shopifyStoreId,
  accessToken,
}: {
  shopifyStoreId: string;
  accessToken: string;
}) {
  let myshopifyDomain: string | undefined;

  try {
    const data = await shopifyAdminGraphql<{
      shop?: { myshopifyDomain?: string };
    }>({
      shopifyStoreId,
      accessToken,
      query: /* GraphQL */ `
        query {
          shop {
            myshopifyDomain
          }
        }
      `,
    });

    myshopifyDomain = data?.shop?.myshopifyDomain;
  } catch {
    myshopifyDomain = undefined;
  }

  if (myshopifyDomain?.toLowerCase() !== shopifyStoreId) {
    throw new DubApiError({
      code: "forbidden",
      message: "Could not verify access to this Shopify store.",
    });
  }
}
