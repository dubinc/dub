export type DomainConnectProviderKind = "vercel" | "cloudflare";

export type DomainConnectDiscovery = {
  providerKind: DomainConnectProviderKind;
  dnsProviderId: string;
  urlSyncUX: string;
};
