import { declineReasons } from "../constant";

import { DeclineReasonKeys } from "./../interface/checkout-form.interface";

export function isValidDeclineReason(
  reason: string,
): reason is DeclineReasonKeys {
  return reason in declineReasons;
}
