import { DubApiError } from "../api/errors";

export type DiscountProviderErrorCode =
  | "INTEGRATION_NOT_AVAILABLE"
  | "AUTH_EXPIRED"
  | "DISCOUNT_ALREADY_EXISTS"
  | "COUPON_NOT_FOUND"
  | "PERMISSIONS_REQUIRED"
  | "CREATE_FAILED";

const API_CODE_BY_PROVIDER_CODE: Record<
  DiscountProviderErrorCode,
  "bad_request" | "conflict" | "internal_server_error"
> = {
  INTEGRATION_NOT_AVAILABLE: "bad_request",
  AUTH_EXPIRED: "bad_request",
  DISCOUNT_ALREADY_EXISTS: "conflict",
  COUPON_NOT_FOUND: "bad_request",
  PERMISSIONS_REQUIRED: "bad_request",
  CREATE_FAILED: "internal_server_error",
};

function resolveDiscountProviderMessage(
  provider: "stripe" | "shopify",
  providerCode: DiscountProviderErrorCode,
  message: string,
): string {
  if (providerCode === "INTEGRATION_NOT_AVAILABLE") {
    return provider === "stripe"
      ? "STRIPE_CONNECTION_REQUIRED: Your workspace isn't connected to Stripe yet. Please install the Dub Stripe app in settings to create a discount."
      : "SHOPIFY_CONNECTION_REQUIRED: Your workspace isn't connected to Shopify yet. Please install the Dub Shopify app in settings to create a discount.";
  }

  if (providerCode === "AUTH_EXPIRED") {
    return provider === "stripe"
      ? "STRIPE_RECONNECT_REQUIRED: Your Stripe connection has expired or been revoked. Please reconnect the Dub Stripe app in settings."
      : "SHOPIFY_RECONNECT_REQUIRED: Your Shopify connection has expired or been revoked. Please reconnect the Dub Shopify app in settings.";
  }

  if (providerCode === "PERMISSIONS_REQUIRED") {
    return provider === "stripe"
      ? "STRIPE_APP_UPGRADE_REQUIRED: Your connected Stripe account doesn't have the permissions needed to create discount codes. Please upgrade your Stripe integration in settings or reach out to our support team for help."
      : "SHOPIFY_APP_UPGRADE_REQUIRED: Your connected Shopify store doesn't have permission to create discount codes. Please reinstall or upgrade the Dub Shopify app.";
  }

  return message;
}

export class DiscountProviderError extends DubApiError {
  constructor(
    public readonly provider: "stripe" | "shopify",
    public readonly providerCode: DiscountProviderErrorCode,
    message: string,
  ) {
    super({
      code: API_CODE_BY_PROVIDER_CODE[providerCode],
      message: resolveDiscountProviderMessage(provider, providerCode, message),
    });
    this.name = "DiscountProviderError";
    Object.setPrototypeOf(this, new.target.prototype);
  }

  get isRecoverable() {
    return this.providerCode === "CREATE_FAILED";
  }
}

export function isDiscountProviderError(
  error: unknown,
): error is DiscountProviderError {
  return error instanceof DiscountProviderError;
}

export function isNonRecoverableDiscountError(
  error: unknown,
): error is DiscountProviderError {
  return isDiscountProviderError(error) && !error.isRecoverable;
}
