import z from "@/lib/zod";
import { metaTagsSchema } from "@/lib/zod/schemas/metatags";
import {
  PartnerEarningsSchema,
  PartnerProfileLinkSchema,
} from "@/lib/zod/schemas/partner-profile";
import { DirectorySyncProviders } from "@boxyhq/saml-jackson";
import {
  CommissionStatus,
  FolderUserRole,
  Link,
  PayoutStatus,
  Prisma,
  ProgramEnrollmentStatus,
  Project,
  User,
  UtmTemplate,
  Webhook,
  YearInReview,
} from "@dub/prisma/client";
import {
  FOLDER_PERMISSIONS,
  FOLDER_WORKSPACE_ACCESS,
} from "./folder/constants";
import { WEBHOOK_TRIGGER_DESCRIPTIONS } from "./webhook/constants";
import { clickEventResponseSchema } from "./zod/schemas/clicks";
import {
  customerActivityResponseSchema,
  customerActivitySchema,
  CustomerEnrichedSchema,
  CustomerSchema,
} from "./zod/schemas/customers";
import { dashboardSchema } from "./zod/schemas/dashboard";
import { DiscountSchema } from "./zod/schemas/discount";
import { FolderSchema } from "./zod/schemas/folders";
import { integrationSchema } from "./zod/schemas/integration";
import { InvoiceSchema } from "./zod/schemas/invoices";
import {
  leadEventResponseSchema,
  trackLeadResponseSchema,
} from "./zod/schemas/leads";
import { createLinkBodySchema } from "./zod/schemas/links";
import { createOAuthAppSchema, oAuthAppSchema } from "./zod/schemas/oauth";
import {
  createPartnerSchema,
  EnrolledPartnerSchemaWithExpandedFields,
  PartnerSchema,
} from "./zod/schemas/partners";
import {
  PartnerPayoutResponseSchema,
  PayoutResponseSchema,
  PayoutSchema,
} from "./zod/schemas/payouts";
import { programDataSchema } from "./zod/schemas/program-onboarding";
import {
  ProgramSaleResponseSchema,
  ProgramSaleSchema,
} from "./zod/schemas/program-sales";
import {
  PartnerProgramInviteSchema,
  ProgramEnrollmentSchema,
  ProgramInviteSchema,
  ProgramPartnerLinkSchema,
  ProgramSchema,
} from "./zod/schemas/programs";
import { RewardSchema } from "./zod/schemas/rewards";
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

export type LinkProps = Link;

// used on client side (e.g. Link builder)
// TODO: standardize this with ExpandedLink
export interface ExpandedLinkProps extends LinkProps {
  tags: TagProps[];
  webhookIds: string[];
  dashboardId: string | null;
}

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
  ios?: string;
  android?: string;
  geo?: object;
  doIndex?: boolean;
  projectId?: string;
  webhookIds?: string[];
}

export interface TagProps {
  id: string;
  name: string;
  color: TagColorProps;
}

export type TagColorProps = (typeof tagColors)[number];

export type UtmTemplateProps = UtmTemplate;
export type UtmTemplateWithUserProps = UtmTemplateProps & {
  user?: UserProps;
};

export type PlanProps = (typeof plans)[number];

export type RoleProps = (typeof roles)[number];

export type BetaFeatures = "noDubLink" | "linkFolders";

export interface WorkspaceProps extends Project {
  logo: string | null;
  plan: PlanProps;
  domains: {
    id: string;
    slug: string;
    primary: boolean;
    verified: boolean;
  }[];
  users: {
    role: RoleProps;
  }[];
  flags?: {
    [key in BetaFeatures]: boolean;
  };
  store: Record<string, any> | null;
}

export type ExpandedWorkspaceProps = WorkspaceProps & {
  programs: {
    id: string;
    name: string;
  }[];
  yearInReview: YearInReview | null;
  allowedHostnames: string[];
};

export type WorkspaceWithUsers = Omit<WorkspaceProps, "domains">;

export interface UserProps {
  id: string;
  name: string;
  email: string;
  image?: string;
  createdAt: Date;
  source: string | null;
  defaultWorkspace?: string;
  defaultPartnerId?: string;
  isMachine: boolean;
  hasPassword: boolean;
  provider: string | null;
}

export interface WorkspaceUserProps extends UserProps {
  role: RoleProps;
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
  placeholder?: string;
  expiredUrl?: string;
  notFoundUrl?: string;
  projectId: string;
  link?: LinkProps;
  registeredDomain?: RegisteredDomainProps;
  logo?: string;
  appleAppSiteAssociation?: string;
  assetLinks?: string;
}

export interface RegisteredDomainProps {
  id: string;
  createdAt: Date;
  expiresAt: Date;
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

export const roles = ["owner", "member"] as const;

export type Role = (typeof roles)[number];

export const tagColors = [
  "red",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "brown",
] as const;

export type DashboardProps = z.infer<typeof dashboardSchema>;

export type MetaTag = z.infer<typeof metaTagsSchema>;

export type TokenProps = z.infer<typeof tokenSchema>;

export type OAuthAppProps = z.infer<typeof oAuthAppSchema>;

export type NewOAuthApp = z.infer<typeof createOAuthAppSchema>;

export type ExistingOAuthApp = OAuthAppProps;

export type IntegrationProps = z.infer<typeof integrationSchema>;

export type NewOrExistingIntegration = Omit<
  IntegrationProps,
  "id" | "verified" | "installations"
> & {
  id?: string;
};

export type InstalledIntegrationProps = Pick<
  IntegrationProps,
  | "id"
  | "projectId"
  | "slug"
  | "logo"
  | "name"
  | "developer"
  | "description"
  | "verified"
  | "comingSoon"
  | "guideUrl"
> & {
  installations: number;
  installed?: boolean;
};

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
  installations: number;
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
  webhookId?: string; // Only if the webhook is managed by an integration
};

export type WebhookTrigger = keyof typeof WEBHOOK_TRIGGER_DESCRIPTIONS;

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

export type PartnersCount = Record<ProgramEnrollmentStatus | "all", number>;

export type SaleProps = z.infer<typeof ProgramSaleSchema>;

export type SalesCount = Record<
  CommissionStatus | "all",
  {
    count: number;
    amount: number;
    earnings: number;
  }
>;

export type SaleResponse = z.infer<typeof ProgramSaleResponseSchema>;

export type PartnerEarningsResponse = z.infer<typeof PartnerEarningsSchema>;

export type CustomerProps = z.infer<typeof CustomerSchema>;

export type PartnerProps = z.infer<typeof PartnerSchema>;

export type ProgramPartnerLinkProps = z.infer<typeof ProgramPartnerLinkSchema>;

export type PartnerProfileLinkProps = z.infer<typeof PartnerProfileLinkSchema>;

export type EnrolledPartnerProps = z.infer<
  typeof EnrolledPartnerSchemaWithExpandedFields
>;

export type DiscountProps = z.infer<typeof DiscountSchema>;

export type ProgramProps = z.infer<typeof ProgramSchema>;

export type ProgramInviteProps = z.infer<typeof ProgramInviteSchema>;

export type PartnerProgramInviteProps = z.infer<
  typeof PartnerProgramInviteSchema
>;

export type ProgramEnrollmentProps = z.infer<typeof ProgramEnrollmentSchema>;

export type PayoutsCount = {
  status: PayoutStatus;
  count: number;
  amount: number;
};

export type PayoutProps = z.infer<typeof PayoutSchema>;

export type PayoutResponse = z.infer<typeof PayoutResponseSchema>;

export type PartnerPayoutResponse = z.infer<typeof PartnerPayoutResponseSchema>;

export type SegmentIntegrationCredentials = {
  writeKey?: string;
};
export type InvoiceProps = z.infer<typeof InvoiceSchema>;

export type CustomerActivity = z.infer<typeof customerActivitySchema>;

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
};

export type FolderWithPermissions = {
  id: string;
  permissions: FolderPermission[];
};

export type FolderSummary = Pick<
  Folder,
  "id" | "name" | "accessLevel" | "linkCount"
>;

// Rewards

export type RewardProps = z.infer<typeof RewardSchema>;

export type CreatePartnerProps = z.infer<typeof createPartnerSchema>;

export type ProgramData = z.infer<typeof programDataSchema>;
