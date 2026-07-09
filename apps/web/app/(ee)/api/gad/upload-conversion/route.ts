import { withCron } from "@/lib/cron/with-cron";
import { googleAdsConversionUploadSchema } from "@/lib/integrations/google-ads/schema";
import { uploadGoogleAdsConversion } from "@/lib/integrations/google-ads/upload-conversion";

export const dynamic = "force-dynamic";

// POST /api/gad/upload-conversion - Upload a conversion to Google Ads
export const POST = withCron(async ({ rawBody }) => {
  const payload = googleAdsConversionUploadSchema.parse(JSON.parse(rawBody));

  await uploadGoogleAdsConversion(payload);

  return new Response("OK");
});
