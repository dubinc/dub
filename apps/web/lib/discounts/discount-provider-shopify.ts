import { prisma } from "@dub/prisma";
import { Discount, PartnerGroup, Project } from "@dub/prisma/client";
import { SHOPIFY_INTEGRATION_ID, nanoid, truncate } from "@dub/utils";
import { z } from "zod/v4";
import { decrypt } from "../encryption";
import {
  ShopifyAdminGraphqlError,
  shopifyAdminGraphql,
} from "../integrations/shopify/admin-graphql";
import { integrationCredentialsSchema } from "../integrations/shopify/schema";
import { createDiscountSchema } from "../zod/schemas/discount";

const MAX_ATTEMPTS = 3;

function createShopifyDiscountProvider() {
  const getInstallation = async (workspace: Project) => {
    if (!workspace.shopifyStoreId) {
      throw new Error(
        "SHOPIFY_CONNECTION_REQUIRED: Your workspace isn't connected to Shopify yet. Please install the Dub Shopify app in settings to create a discount.",
      );
    }

    const installation = await prisma.installedIntegration.findFirst({
      where: {
        projectId: workspace.id,
        integrationId: SHOPIFY_INTEGRATION_ID,
      },
    });

    if (!installation) {
      throw new Error(
        "SHOPIFY_CONNECTION_REQUIRED: Your workspace isn't connected to Shopify yet. Please install the Dub Shopify app in settings to create a discount.",
      );
    }

    let credentials = integrationCredentialsSchema.parse(
      installation.credentials || {},
    );

    if (!credentials?.scope?.includes("write_discounts")) {
      throw new Error(
        "SHOPIFY_APP_UPGRADE_REQUIRED: Your connected Shopify store doesn't have permission to create discount codes. Please reinstall or upgrade the Dub Shopify app.",
      );
    }

    credentials = {
      ...credentials,
      accessToken: credentials.accessToken
        ? decrypt(credentials.accessToken)
        : null,
    };

    return {
      ...installation,
      credentials,
    };
  };

  const getOrCreateCoupon = async ({
    workspace,
    group,
    data,
  }: {
    workspace: Project;
    group: PartnerGroup;
    data: z.infer<typeof createDiscountSchema>;
  }) => {
    await getInstallation(workspace);

    if ((data.maxDuration ?? null) !== 0) {
      throw new Error(
        "Shopify discounts only support one-time use. Set the discount duration to 'one-time'.",
      );
    }

    return {
      id: null,
      amount: data.amount,
      type: data.type,
      maxDuration: 0,
      description: `Dub Discount (${truncate(group.name, 25)})`,
    };
  };

  const createDiscountCode = async ({
    workspace,
    discount,
    code,
    shouldRetry = true,
  }: {
    workspace: Project;
    discount: Pick<Discount, "id" | "amount" | "type">;
    code: string;
    shouldRetry?: boolean;
  }) => {
    const { credentials } = await getInstallation(workspace);
    const shopifyStoreId = workspace.shopifyStoreId!;
    const accessToken = credentials.accessToken!;

    let attempt = 0;
    let currentCode = code;

    while (attempt < MAX_ATTEMPTS) {
      try {
        const data = await shopifyAdminGraphql<{
          discountCodeBasicCreate: {
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
          };
        }>({
          shopifyStoreId,
          accessToken,
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
              appliesOncePerCustomer: true,
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

        return { code: codeDiscountNode.codeDiscount.codes.nodes[0].code };
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
    workspace: Project;
    code: string;
  }) => {
    const { credentials } = await getInstallation(workspace);
    const shopifyStoreId = workspace.shopifyStoreId!;
    const accessToken = credentials.accessToken!;

    const lookup = await shopifyAdminGraphql<{
      codeDiscountNodeByCode: { id: string } | null;
    }>({
      shopifyStoreId,
      accessToken,
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
        `Shopify discount code ${code} not found (shopifyStoreId=${shopifyStoreId}).`,
      );
      return;
    }

    const data = await shopifyAdminGraphql<{
      discountCodeDeactivate: {
        codeDiscountNode: { id: string } | null;
        userErrors: {
          field: string[] | null;
          message: string;
          code: string;
        }[];
      };
    }>({
      shopifyStoreId,
      accessToken,
      query: /* GraphQL */ `
        mutation DiscountCodeDeactivate($id: ID!) {
          discountCodeDeactivate(id: $id) {
            codeDiscountNode {
              id
            }
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

    const { userErrors } = data.discountCodeDeactivate;

    if (userErrors.length > 0) {
      throw new ShopifyAdminGraphqlError(
        userErrors[0].code,
        userErrors[0].message,
        userErrors,
      );
    }

    console.info(
      `Disabled Shopify discount code ${code} (id=${id}, shopifyStoreId=${shopifyStoreId}).`,
    );

    return { id, code };
  };

  return {
    getInstallation,
    getOrCreateCoupon,
    createDiscountCode,
    disableDiscountCode,
  };
}

export const shopifyDiscountProvider = createShopifyDiscountProvider();
