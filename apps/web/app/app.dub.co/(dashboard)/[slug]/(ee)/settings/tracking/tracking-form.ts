export type TrackedSitemapDraft = {
  url: string;
  lastCrawledAt?: string;
  lastUrlCount?: number;
};

export type TrackingFormData = {
  stack: string[];
  allowedHostnames: string[];
  publishableKey: string | null;
  siteVisitTrackingEnabled: boolean;
  siteDomainSlug: string;
  trackedSitemaps: TrackedSitemapDraft[];
  outboundDomainTrackingEnabled: boolean;
};

export const emptyTrackingFormValues: TrackingFormData = {
  stack: [],
  allowedHostnames: [],
  publishableKey: null,
  siteVisitTrackingEnabled: false,
  siteDomainSlug: "",
  trackedSitemaps: [],
  outboundDomainTrackingEnabled: false,
};
