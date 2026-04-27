import { DubApiError } from "../api/errors";

export class DiscountIntegrationNotAvailableError extends DubApiError {
  constructor({ message }: { message: string }) {
    super({ code: "bad_request", message });
    this.name = "DiscountIntegrationNotAvailableError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function isDiscountIntegrationNotAvailableError(
  error: unknown,
): error is DiscountIntegrationNotAvailableError {
  return error instanceof DiscountIntegrationNotAvailableError;
}
