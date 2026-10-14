function createCustomDiscountProvider() {
  const getCoupon = async () => {
    throw new Error("Custom discount provider does not support this method.");
  };

  const createCoupon = async () => {
    throw new Error("Custom discount provider does not support this method.");
  };

  const createDiscountCode = async ({ code }: { code: string }) => {
    return { code };
  };

  const disableDiscountCode = async () => {
    // Dub is the source of truth; external apps disable coupons via webhook.
  };

  const assertDiscountIntegration = async () => {
    // Custom discounts do not require Stripe or Shopify.
  };

  return {
    getCoupon,
    createCoupon,
    createDiscountCode,
    disableDiscountCode,
    assertDiscountIntegration,
  };
}

export const customDiscountProvider = createCustomDiscountProvider();
