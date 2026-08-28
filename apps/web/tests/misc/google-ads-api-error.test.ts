import {
  formatApiErrorDetail,
  isGoogleAdsPermissionDenied,
} from "@/lib/integrations/google-ads/api";
import { describe, expect, it } from "vitest";

// searchStream 403s arrive as a JSON array. The human message omits the
// authorization error-code enum that retry classification depends on.
const permissionDeniedWithoutCodeInMessage = [
  {
    error: {
      code: 403,
      message: "The caller does not have permission",
      status: "PERMISSION_DENIED",
      details: [
        {
          "@type":
            "type.googleapis.com/google.ads.googleads.v22.errors.GoogleAdsFailure",
          errors: [
            {
              errorCode: {
                authorizationError: "USER_PERMISSION_DENIED",
              },
              message:
                "User doesn't have permission to access customer. Note: If you're accessing a client customer, the manager's customer id must be set in the 'login-customer-id' header.",
            },
          ],
          requestId: "RWSdEB8C1WuiLgZl38biSQ",
        },
      ],
    },
  },
];

describe("formatApiErrorDetail", () => {
  it("preserves USER_PERMISSION_DENIED when the message omits the error code", () => {
    const adsMessage =
      permissionDeniedWithoutCodeInMessage[0].error.details[0].errors[0]
        .message;

    expect(adsMessage).not.toContain("USER_PERMISSION_DENIED");

    const detail = formatApiErrorDetail(
      permissionDeniedWithoutCodeInMessage,
      "",
    );

    expect(detail).toContain("USER_PERMISSION_DENIED");
    expect(
      isGoogleAdsPermissionDenied(
        new Error(
          `[Google Ads API] Request failed for searchStream (403): ${detail}`,
        ),
      ),
    ).toBe(true);
  });
});
