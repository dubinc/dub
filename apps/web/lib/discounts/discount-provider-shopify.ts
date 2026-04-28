import { prisma } from "@dub/prisma";
import { Discount, Project } from "@dub/prisma/client";
import { SHOPIFY_INTEGRATION_ID, nanoid } from "@dub/utils";
import {
  ShopifyAdminGraphqlError,
  shopifyAdminGraphql,
} from "../integrations/shopify/admin-graphql";
import { integrationCredentialsSchema } from "../integrations/shopify/schema";
import { DiscountIntegrationNotAvailableError } from "./discount-error";

interface ShopifyDiscountCodeBasicCreate {
  codeDiscountNode: {
    id: string;
    codeDiscount: {
      codes: { nodes: { code: string }[] };
    };
  } | null;
  userErrors: {
    field: string[] | null;
    message: string;
    code: string;
  }[];
}

interface ShopifyDiscountCodeDelete {
  deletedCodeDiscountId: string | null;
  userErrors: {
    field: string[] | null;
    message: string;
    code: string;
  }[];
}

const MAX_ATTEMPTS = 3;

async function requireInstalledIntegration(
  workspace: Pick<Project, "id" | "shopifyStoreId">,
) {
  if (!workspace.shopifyStoreId) {
    throw new DiscountIntegrationNotAvailableError({
      message:
        "SHOPIFY_CONNECTION_REQUIRED: Your workspace isn't connected to Shopify yet. Please install the Dub Shopify app in settings to create a discount.",
    });
  }

  const installation = await prisma.installedIntegration.findFirst({
    where: {
      projectId: workspace.id,
      integrationId: SHOPIFY_INTEGRATION_ID,
    },
  });

  if (!installation) {
    throw new DiscountIntegrationNotAvailableError({
      message:
        "SHOPIFY_CONNECTION_REQUIRED: Your workspace isn't connected to Shopify yet. Please install the Dub Shopify app in settings to create a discount.",
    });
  }

  let credentials = integrationCredentialsSchema.parse(
    installation.credentials || {},
  );

  if (!credentials?.scope?.includes("write_discounts")) {
    throw new DiscountIntegrationNotAvailableError({
      message:
        "SHOPIFY_APP_UPGRADE_REQUIRED: Your connected Shopify store doesn't have permission to create discount codes. Please reinstall or upgrade the Dub Shopify app.",
    });
  }

  return {
    ...installation,
    credentials,
  };
}

function createShopifyDiscountProvider() {
  const getCoupon = async () => {
    throw new Error("Shopify does not this method.");
  };

  const createCoupon = async () => {
    throw new Error("Shopify does not this method.");
  };

  const createDiscountCode = async ({
    workspace,
    discount,
    code,
    shouldRetry = true,
  }: {
    workspace: Pick<Project, "id" | "shopifyStoreId">;
    discount: Pick<Discount, "id" | "amount" | "type">;
    code: string;
    shouldRetry?: boolean;
  }) => {
    const { credentials } = await requireInstalledIntegration(workspace);

    let attempt = 0;
    let currentCode = code;

    while (attempt < MAX_ATTEMPTS) {
      try {
        const data = await shopifyAdminGraphql<{
          discountCodeBasicCreate: ShopifyDiscountCodeBasicCreate;
        }>({
          shopifyStoreId: workspace.shopifyStoreId!,
          accessToken: credentials.accessToken!,
          query: /* GraphQL */ `
            mutation DiscountCodeBasicCreate(
              $basicCodeDiscount: DiscountCodeBasicInput!
            ) {
              discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
                codeDiscountNode {
                  id
                  codeDiscount {
                    ... on DiscountCodeBasic {
                      codes(first: 1) {
                        nodes {
                          code
                        }
                      }
                    }
                  }
                }
                userErrors {
                  field
                  message
                  code
                }
              }
            }
          `,
          variables: {
            basicCodeDiscount: {
              title: `Dub Discount (${currentCode})`,
              code: currentCode.toUpperCase(),
              startsAt: new Date().toISOString(),
              customerSelection: { all: true },
              appliesOncePerCustomer: true,
              customerGets: {
                items: { all: true },
                value:
                  discount.type === "percentage"
                    ? { percentage: discount.amount / 100 }
                    : {
                        discountAmount: {
                          amount: (discount.amount / 100).toFixed(2),
                          appliesOnEachItem: false,
                        },
                      },
              },
            },
          },
        });

        const { codeDiscountNode, userErrors } = data.discountCodeBasicCreate;

        if (userErrors.length > 0) {
          throw new ShopifyAdminGraphqlError(
            userErrors[0].code,
            userErrors[0].message,
            userErrors,
          );
        }

        if (!codeDiscountNode) {
          throw new ShopifyAdminGraphqlError(
            "no_node_returned",
            "Shopify did not return a discount code node.",
          );
        }

        return {
          code: codeDiscountNode.codeDiscount.codes.nodes[0].code,
        };
      } catch (error) {
        const isDuplicate =
          error instanceof ShopifyAdminGraphqlError &&
          (error.code === "TAKEN" || error.code === "DUPLICATE");

        if (!isDuplicate || !shouldRetry) {
          throw error;
        }

        attempt++;

        if (attempt >= MAX_ATTEMPTS) {
          throw error;
        }

        const newCode = `${currentCode}${nanoid(2)}`;

        console.warn(
          `Discount code "${currentCode}" already exists in Shopify. Retrying with "${newCode}" (attempt ${attempt}/${MAX_ATTEMPTS}).`,
        );

        currentCode = newCode;
      }
    }

    throw new Error("Failed to create Shopify discount code.");
  };

  const disableDiscountCode = async ({
    workspace,
    code,
  }: {
    workspace: Pick<Project, "id" | "shopifyStoreId">;
    code: string;
  }) => {
    const { credentials } = await requireInstalledIntegration(workspace);

    const lookup = await shopifyAdminGraphql<{
      codeDiscountNodeByCode: { id: string } | null;
    }>({
      shopifyStoreId: workspace.shopifyStoreId!,
      accessToken: credentials.accessToken!,
      query: /* GraphQL */ `
        query CodeDiscountNodeByCode($code: String!) {
          codeDiscountNodeByCode(code: $code) {
            id
          }
        }
      `,
      variables: { code },
    });

    const id = lookup.codeDiscountNodeByCode?.id;

    if (!id) {
      console.error(
        `Shopify discount code ${code} not found (shopifyStoreId=${workspace.shopifyStoreId!}).`,
      );
      return;
    }

    const data = await shopifyAdminGraphql<{
      discountCodeDelete: ShopifyDiscountCodeDelete;
    }>({
      shopifyStoreId: workspace.shopifyStoreId!,
      accessToken: credentials.accessToken!,
      query: /* GraphQL */ `
        mutation DiscountCodeDelete($id: ID!) {
          discountCodeDelete(id: $id) {
            deletedCodeDiscountId
            userErrors {
              field
              message
              code
            }
          }
        }
      `,
      variables: { id },
    });

    const { userErrors } = data.discountCodeDelete;

    if (userErrors.length > 0) {
      throw new ShopifyAdminGraphqlError(
        userErrors[0].code,
        userErrors[0].message,
        userErrors,
      );
    }

    console.info(
      `Deleted Shopify discount code ${code} (id=${id}, shopifyStoreId=${workspace.shopifyStoreId}).`,
    );

    return { id, code };
  };

  const assertDiscountIntegrationAvailable = async ({
    workspace,
  }: {
    workspace: Pick<Project, "id" | "stripeConnectId" | "shopifyStoreId">;
  }) => {
    await requireInstalledIntegration(workspace);
  };

  return {
    getCoupon,
    createCoupon,
    createDiscountCode,
    disableDiscountCode,
    assertDiscountIntegrationAvailable,
  };
}

export const shopifyDiscountProvider = createShopifyDiscountProvider();
