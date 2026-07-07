import { GOOGLE_ADS_INTEGRATION_ID } from "@dub/utils";
import { googleAdsProvider } from "./google-ads/provider";
import { IntegrationProvider } from "./integration-provider";

const integrationProviders: Partial<
  Record<string, IntegrationProvider<unknown, unknown>>
> = {
  [GOOGLE_ADS_INTEGRATION_ID]: googleAdsProvider,
};

export function getIntegrationProvider(integrationId: string) {
  return integrationProviders[integrationId];
}
