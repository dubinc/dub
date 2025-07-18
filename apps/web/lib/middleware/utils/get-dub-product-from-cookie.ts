import { cookies } from "next/headers";

/**
 * Get the Dub product from the workspace cookie with fallback to "links"
 * @param workspace - The workspace identifier to lookup the product for
 * @returns The product ("links" or "program"), defaults to "links"
 */
export const getDubProductFromCookie = (
  workspace: string,
): "links" | "program" => {
  // Default to links
  let product: "links" | "program" = "links";

  const productCookie = cookies().get(`dub_product:${workspace}`)?.value;

  if (productCookie && ["links", "program"].includes(productCookie)) {
    product = productCookie as "links" | "program";
  }

  return product;
};
