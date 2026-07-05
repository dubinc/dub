import { InstalledIntegration } from "@prisma/client";
import { buildConversionActionResourceName, GoogleAdsApi } from "./client";
import { googleAdsOAuthProvider } from "./oauth";
import { UploadClickConversion, uploadClickConversionSchema } from "./schema";

// Upload a single offline conversion to Google Ads on behalf of a connected
// workspace. Handles token refresh, so callers only need the installation +
// conversion details (gclid, value, timestamp, conversion action).
export const uploadGoogleAdsConversion = async ({
  installation,
  conversion,
}: {
  installation: InstalledIntegration;
  conversion: UploadClickConversion;
}) => {
  const {
    customerId,
    conversionActionId,
    gclid,
    wbraid,
    gbraid,
    conversionDateTime,
    conversionValue,
    currencyCode,
    orderId,
  } = uploadClickConversionSchema.parse(conversion);

  const token =
    await googleAdsOAuthProvider.refreshTokenForInstallation(installation);

  const client = new GoogleAdsApi({ accessToken: token.access_token });

  const result = await client.uploadClickConversions({
    customerId,
    conversions: [
      {
        conversionAction: buildConversionActionResourceName({
          customerId,
          conversionActionId,
        }),
        ...(gclid ? { gclid } : {}),
        ...(wbraid ? { wbraid } : {}),
        ...(gbraid ? { gbraid } : {}),
        conversionDateTime,
        conversionValue,
        currencyCode,
        ...(orderId ? { orderId } : {}),
      },
    ],
  });

  if (result.partialFailureError) {
    console.error(
      "[Google Ads] uploadClickConversions partial failure",
      result.partialFailureError,
    );
  }

  return result;
};
