import type { SiteVisitTrackingSettingsValue } from "@/lib/sitemaps/site-visit-tracking";
import { DirectorySyncProviders } from "@boxyhq/saml-jackson";
import {
  FolderUserRole,
  Link,
  Prisma,
  Project,
  User,
  UtmTemplate,
  Webhook,
  WorkspaceRole,
} from "@prisma/client";
import * as z from "zod/v4";
import { RESOURCE_COLORS } from "../ui/colors";
import {
  apiLogCountGroupBySchema,
  apiLogCountRowSchemas,
  apiLogEnrichedSchema,
  apiLogSchemaTB,
  apiLogTimeseriesGranularitySchema,
  apiLogTimeseriesRowSchema,
  requestTypeSchema,
} from "./api-logs/schemas";
import {
  FOLDER_PERMISSIONS,
  FOLDER_WORKSPACE_ACCESS,
} from "./folder/constants";
import {
  clickEventResponseSchema,
  clickEventSchemaTB,
} from "./zod/schemas/clicks";
import { customerActivityResponseSchema } from "./zod/schemas/customer-activity";
import {
  CustomerEnrichedSchema,
  CustomerSchema,
} from "./zod/schemas/customers";
import { dashboardSchema } from "./zod/schemas/dashboard";
import { FolderSchema } from "./zod/schemas/folders";
import {
  installedIntegrationSchema,
  integrationSchema,
} from "./zod/schemas/integration";
import { InvoiceSchema } from "./zod/schemas/invoices";
import {
  leadEventResponseSchema,
  leadEventSchemaTB,
  trackLeadResponseSchema,
} from "./zod/schemas/leads";
import {
  ABTestVariantsSchema,
  createLinkBodySchema,
} from "./zod/schemas/links";
import { createOAuthAppSchema, oAuthAppSchema } from "./zod/schemas/oauth";
import {
  saleEventResponseSchema,
  trackSaleResponseSchema,
} from "./zod/schemas/sales";
import { tokenSchema } from "./zod/schemas/token";
import { usageResponse } from "./zod/schemas/usage";
import {
  createWebhookSchema,
  webhookEventSchemaTB,
  WebhookSchema,
} from "./zod/schemas/webhooks";
import { workspacePreferencesSchema } from "./zod/schemas/workspace-preferences";
import { workspaceUserSchema } from "./zod/schemas/workspaces";

export type LinkProps = Omit<Link, "saleAmount"> & {
  saleAmount: number;
};

// used on client side (e.g. Link builder)
// TODO: standardize this with ExpandedLink
export type ExpandedLinkProps = LinkProps & {
  tags: TagProps[];
  webhookIds: string[];
  dashboardId: string | null;
  user?: UserProps;
};

export interface SimpleLinkProps {
  domain: string;
  key: string;
  url: string;
}

export interface QRLinkProps {
  domain: string;
  key?: string;
  url?: string;
}

export interface RedisLinkProps {
  id: string;
  url?: string;
  trackConversion?: boolean;
  password?: boolean;
  proxy?: boolean;
  rewrite?: boolean;
  expiresAt?: Date;
  expiredUrl?: string;
  disabledAt?: Date;
  ios?: string;
  android?: string;
  geo?: object;
  doIndex?: boolean;
  projectId?: string;
  webhookIds?: string[];
  testVariants?: z.infer<typeof ABTestVariantsSchema>;
  testCompletedAt?: Date;
}

export type ResourceColorsEnum = (typeof RESOURCE_COLORS)[number];

export interface TagProps {
  id: string;
  name: string;
  color: ResourceColorsEnum;
}

export type UtmTemplateProps = UtmTemplate;
export type UtmTemplateWithUserProps = UtmTemplateProps & {
  user?: UserProps;
};

export type PlanProps = (typeof plans)[number];

export type BetaFeatures =
  | "analyticsSettingsSiteVisitTracking"
  | "noProrationUpgrade";

export interface WorkspaceProps
  extends Omit<Project, "siteVisitTrackingSettings"> {
  logo: string | null;
  plan: PlanProps;
  siteVisitTrackingSettings: SiteVisitTrackingSettingsValue | null;
  domains: {
    slug: string;
    primary: boolean;
    verified: boolean;
  }[];
  users: {
    role: WorkspaceRole;
    defaultFolderId: string | null;
  }[];
  flags?: {
    [key in BetaFeatures]: boolean;
  };
  store: Record<string, any> | null;
}

export interface ExtendedWorkspaceProps extends WorkspaceProps {
  domains: (WorkspaceProps["domains"][number] & {
    linkRetentionDays: number | null;
  })[];
  allowedHostnames: string[];
  users: (WorkspaceProps["users"][number] & {
    workspacePreferences?: z.infer<typeof workspacePreferencesSchema>;
  })[];
  publishableKey: string | null;
}

export type WorkspaceWithUsers = Omit<WorkspaceProps, "domains">;

export type WorkspaceUserProps = z.infer<typeof workspaceUserSchema>;

export interface UserProps {
  id: string;
  name: string;
  email: string;
  image?: string;
  createdAt: Date;
  source: string | null;
  defaultWorkspace?: string;
  isMachine: boolean;
  hasPassword: boolean;
  provider: string | null;
}

export type DomainVerificationStatusProps =
  | "Valid Configuration"
  | "Invalid Configuration"
  | "Conflicting DNS Records"
  | "Pending Verification"
  | "Domain Not Found"
  | "Unknown Error";

export interface DomainProps {
  id: string;
  slug: string;
  verified: boolean;
  primary: boolean;
  archived: boolean;
  createdAt: Date;
  placeholder?: string;
  expiredUrl?: string;
  notFoundUrl?: string;
  projectId: string;
  logo?: string;
  appleAppSiteAssociation?: string;
  assetLinks?: string;
  deepviewData?: string;
  link?: LinkProps;
  registeredDomain?: RegisteredDomainProps;
}

export interface RegisteredDomainProps {
  id: string;
  autoRenewalDisabledAt: Date | null;
  createdAt: Date;
  expiresAt: Date;
  renewalFee: number;
}

export interface BitlyGroupProps {
  guid: string;
  bsds: string[]; // custom domains
  tags: string[];
}

export interface ImportedDomainCountProps {
  id: number;
  domain: string;
  links: number;
}

export interface SAMLProviderProps {
  name: string;
  logo: string;
  saml: "okta" | "azure" | "google";
  samlModalCopy: string;
  scim: keyof typeof DirectorySyncProviders;
  scimModalCopy: {
    url: string;
    token: string;
  };
}

export type NewLinkProps = z.infer<typeof createLinkBodySchema>;

type ProcessedLinkOverrides = "domain" | "key" | "url" | "projectId";

export type ProcessedLinkProps = Omit<NewLinkProps, ProcessedLinkOverrides> &
  Pick<LinkProps, ProcessedLinkOverrides> & { userId?: LinkProps["userId"] } & {
    createdAt?: Date;
    id?: string;
  };

export const plans = [
  "free",
  "pro",
  "business",
  "business plus",
  "business extra",
  "business max",
  "advanced",
  "enterprise",
] as const;

export type DashboardProps = z.infer<typeof dashboardSchema>;

export type TokenProps = z.infer<typeof tokenSchema>;

export type OAuthAppProps = z.infer<typeof oAuthAppSchema>;

export type OAuthAppWithClientSecret = OAuthAppProps & { clientSecret: string };

export type NewOAuthApp = z.infer<typeof createOAuthAppSchema>;

export type IntegrationProps = z.infer<typeof integrationSchema>;

export type NewOrExistingIntegration = Omit<
  IntegrationProps,
  "id" | "verified" | "installations"
> & {
  id?: string;
};

export type InstalledIntegrationProps = z.infer<
  typeof installedIntegrationSchema
>;

export type InstalledIntegrationInfoProps = Pick<
  IntegrationProps,
  | "id"
  | "projectId"
  | "slug"
  | "logo"
  | "name"
  | "developer"
  | "description"
  | "verified"
  | "readme"
  | "website"
  | "screenshots"
  | "installUrl"
> & {
  createdAt: Date;
  installed: {
    id: string;
    createdAt: Date;
    by: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
    };
  } | null;
  credentials?: Prisma.JsonValue;
  settings?: Prisma.JsonValue;
  webhookId?: string; // Only if the webhook is managed by an integration
};

export type WebhookProps = z.infer<typeof WebhookSchema>;

export type NewWebhook = z.infer<typeof createWebhookSchema>;

export type WebhookEventProps = z.infer<typeof webhookEventSchemaTB>;

export type WebhookCacheProps = Pick<
  Webhook,
  "id" | "url" | "secret" | "triggers" | "disabledAt"
>;

export type TrackLeadResponse = z.infer<typeof trackLeadResponseSchema>;

export type TrackSaleResponse = z.infer<typeof trackSaleResponseSchema>;

export type Customer = z.infer<typeof CustomerSchema>;

export type CustomerEnriched = z.infer<typeof CustomerEnrichedSchema>;

export type UsageResponse = z.infer<typeof usageResponse>;

export type CustomerProps = z.infer<typeof CustomerSchema>;

export type SegmentIntegrationCredentials = {
  writeKey?: string;
};
export type InvoiceProps = z.infer<typeof InvoiceSchema>;

export type CustomerActivityResponse = z.infer<
  typeof customerActivityResponseSchema
>;

export type ClickEvent = z.infer<typeof clickEventResponseSchema>;

export type SaleEvent = z.infer<typeof saleEventResponseSchema>;

export type LeadEvent = z.infer<typeof leadEventResponseSchema>;

// Folders

export type Folder = z.infer<typeof FolderSchema>;

export type FolderAccessLevel = keyof typeof FOLDER_WORKSPACE_ACCESS;

export type FolderPermission = (typeof FOLDER_PERMISSIONS)[number];

export type FolderUser = Pick<User, "id" | "name" | "email" | "image"> & {
  role: FolderUserRole;
  workspaceRole: WorkspaceRole;
};

export type FolderWithPermissions = {
  id: string;
  permissions: FolderPermission[];
};

export type FolderSummary = Pick<
  Folder,
  "id" | "name" | "description" | "accessLevel"
>;

export type PaymentMethodOption = {
  currency?: string;
  mandate_options?: {
    payment_schedule?: string;
    transaction_type?: string;
  };
};
export interface FolderLinkCount {
  folderId: string;
  _count: number;
}

export type ClickEventTB = z.infer<typeof clickEventSchemaTB>;

export type LeadEventTB = z.infer<typeof leadEventSchemaTB>;

export type StripeMode = "test" | "sandbox" | "live";

export type NullableOptional<T> = {
  [K in keyof T]?: T[K] | null;
};

export type EnrichedApiLog = z.infer<typeof apiLogEnrichedSchema>;

export type ApiLogsCountRow = z.infer<
  typeof apiLogCountRowSchemas.routePattern
>;

export type ApiLogsCountByRoutePattern = ApiLogsCountRow;

export type ApiLogsCountByStatusCode = z.infer<
  typeof apiLogCountRowSchemas.statusCode
>;

export type ApiLogsCountByMethod = z.infer<typeof apiLogCountRowSchemas.method>;

export type ApiLogsCountGroupBy = z.infer<typeof apiLogCountGroupBySchema>;

export type RequestType = z.infer<typeof requestTypeSchema>;

export type ApiLogTB = z.infer<typeof apiLogSchemaTB>;

export type ApiLogsTimeseriesRow = z.infer<typeof apiLogTimeseriesRowSchema>;

export type ApiLogsGranularity = z.infer<
  typeof apiLogTimeseriesGranularitySchema
>;
