import { withCron } from "@/lib/cron/with-cron";
import { googleAdsConversionUploadSchema } from "@/lib/integrations/google-ads/schema";
import { uploadGoogleAdsConversion } from "@/lib/integrations/google-ads/upload-conversion";
import { logAndRespond } from "../../cron/utils";

export const dynamic = "force-dynamic";

// POST /api/google-ads/upload-conversion - Upload a conversion to Google Ads
export const POST = withCron(async ({ rawBody }) => {
  const payload = googleAdsConversionUploadSchema.parse(JSON.parse(rawBody));

  const { message, status } = await uploadGoogleAdsConversion(payload);

  if (status === "failed") {
    return logAndRespond(message, { status: 500, logLevel: "error" });
  }

  return logAndRespond(message, {
    logLevel: status === "skipped" ? "warn" : "info",
  });
});
