export class ShopifyError extends Error {
  readonly data: Record<string, string> | null;

  constructor(message: string, data: Record<string, string> | null = null) {
    super(message);
    this.name = "ShopifyError";
    this.data = data;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function isShopifyError(error: unknown): error is ShopifyError {
  return error instanceof ShopifyError;
}
