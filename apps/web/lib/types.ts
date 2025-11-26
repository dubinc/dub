import {
  PartnerBountySchema,
  PartnerEarningsSchema,
  PartnerProfileCustomerSchema,
  PartnerProfileLinkSchema,
  partnerUserSchema,
} from "@/lib/zod/schemas/partner-profile";
import { DirectorySyncProviders } from "@boxyhq/saml-jackson";
import {
  CommissionStatus,
  FolderUserRole,
  FraudRuleType,
  Link,
  PartnerGroup,
  PartnerRole,
  PayoutStatus,
  Prisma,
  ProgramEnrollmentStatus,
  Project,
  User,
  UtmTemplate,
  Webhook,
  WorkspaceRole,
} from "@dub/prisma/client";
import { z } from "zod";
import { RESOURCE_COLORS } from "../ui/colors";
import { PAID_TRAFFIC_PLATFORMS } from "./api/fraud/constants";
import { BOUNTY_SUBMISSION_REQUIREMENTS } from "./constants/bounties";
import {
  FOLDER_PERMISSIONS,
  FOLDER_WORKSPACE_ACCESS,
} from "./folder/constants";
import { WEBHOOK_TRIGGER_DESCRIPTIONS } from "./webhook/constants";
import {
  BountyListSchema,
  BountySchema,
  BountySubmissionExtendedSchema,
  getBountySubmissionsQuerySchema,
} from "./zod/schemas/bounties";
import {
  CampaignListSchema,
  CampaignSchema,
  campaignSummarySchema,
  EMAIL_TEMPLATE_VARIABLES,
  updateCampaignSchema,
} from "./zod/schemas/campaigns";
import {
  clickEventResponseSchema,
  clickEventSchemaTB,
} from "./zod/schemas/clicks";
import { CommissionEnrichedSchema } from "./zod/schemas/commissions";
import { customerActivityResponseSchema } from "./zod/schemas/customer-activity";
import {
  CustomerEnrichedSchema,
  CustomerSchema,
} from "./zod/schemas/customers";
import { dashboardSchema } from "./zod/schemas/dashboard";
import { DiscountCodeSchema, DiscountSchema } from "./zod/schemas/discount";
import { EmailDomainSchema } from "./zod/schemas/email-domains";
import { FolderSchema } from "./zod/schemas/folders";
import {
  groupedFraudEventSchema,
  fraudRuleSchema,
  updateFraudRuleSettingsSchema,
} from "./zod/schemas/fraud";
import { GroupWithProgramSchema } from "./zod/schemas/group-with-program";
import {
  additionalPartnerLinkSchemaOptionalPath,
  GroupSchema,
  GroupSchemaExtended,
  GroupWithFormDataSchema,
  PartnerGroupDefaultLinkSchema,
} from "./zod/schemas/groups";
import { integrationSchema } from "./zod/schemas/integration";
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
import { MessageSchema } from "./zod/schemas/messages";
import { createOAuthAppSchema, oAuthAppSchema } from "./zod/schemas/oauth";
import {
  NetworkPartnerSchema,
  PartnerConversionScoreSchema,
} from "./zod/schemas/partner-network";
import {
  createPartnerSchema,
  EnrolledPartnerSchema,
  EnrolledPartnerSchemaExtended,
  PartnerSchema,
  WebhookPartnerSchema,
} from "./zod/schemas/partners";
import {
  PartnerPayoutResponseSchema,
  PayoutResponseSchema,
} from "./zod/schemas/payouts";
import {
  programApplicationFormDataWithValuesSchema,
  programApplicationFormFieldWithValuesSchema,
  programApplicationFormSchema,
} from "./zod/schemas/program-application-form";
import { programInviteEmailDataSchema } from "./zod/schemas/program-invite-email";
import { programLanderSchema } from "./zod/schemas/program-lander";
import { programDataSchema } from "./zod/schemas/program-onboarding";
import {
  PartnerCommentSchema,
  ProgramEnrollmentSchema,
  ProgramSchema,
} from "./zod/schemas/programs";
import {
  rewardConditionsArraySchema,
  rewardConditionSchema,
  rewardConditionsSchema,
  rewardContextSchema,
  RewardSchema,
} from "./zod/schemas/rewards";
import {
  saleEventResponseSchema,
  trackSaleResponseSchema,
} from "./zod/schemas/sales";
import { fraudEventContext } from "./zod/schemas/schemas";
import { tokenSchema } from "./zod/schemas/token";
import { usageResponse } from "./zod/schemas/usage";
import {
  createWebhookSchema,
  webhookEventSchemaTB,
  WebhookSchema,
} from "./zod/schemas/webhooks";
import {
  WORKFLOW_ATTRIBUTES,
  WORKFLOW_COMPARISON_OPERATORS,
  workflowActionSchema,
  workflowConditionSchema,
} from "./zod/schemas/workflows";
import { workspacePreferencesSchema } from "./zod/schemas/workspace-preferences";
import { workspaceUserSchema } from "./zod/schemas/workspaces";

export type LinkProps = Link;

// used on client side (e.g. Link builder)
// TODO: standardize this with ExpandedLink
export interface ExpandedLinkProps extends LinkProps {
  tags: TagProps[];
  webhookIds: string[];
  dashboardId: string | null;
  user?: UserProps;
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
  disabledAt?: Date;
  ios?: string;
  android?: string;
  geo?: object;
  doIndex?: boolean;
  projectId?: string;
  webhookIds?: string[];
  programId?: string;
  partnerId?: string;
  partner?: Pick<PartnerProps, "id" | "name" | "image">;
  discount?: Pick<
    DiscountProps,
    "id" | "amount" | "type" | "maxDuration" | "couponId" | "couponTestId"
  >;
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

export type BetaFeatures = "noDubLink" | "analyticsSettingsSiteVisitTracking";

export interface WorkspaceProps extends Project {
  logo: string | null;
  plan: PlanProps;
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
  defaultProgramId: string | null;
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
  defaultPartnerId?: string;
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
    partnerGroupDefaultLinkId?: string | null;
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

export type WebhookTrigger = keyof typeof WEBHOOK_TRIGGER_DESCRIPTIONS;

export type WebhookProps = z.infer<typeof WebhookSchema>;

export type NewWebhook = z.infer<typeof createWebhookSchema>;

export type WebhookEventProps = z.infer<typeof webhookEventSchemaTB>;

export type WebhookCacheProps = Pick<
  Webhook,
  "id" | "url" | "secret" | "triggers" | "disabledAt"
>;

export type WebhookPartner = z.infer<typeof WebhookPartnerSchema>;

export type TrackLeadResponse = z.infer<typeof trackLeadResponseSchema>;

export type TrackSaleResponse = z.infer<typeof trackSaleResponseSchema>;

export type Customer = z.infer<typeof CustomerSchema>;

export type CustomerEnriched = z.infer<typeof CustomerEnrichedSchema>;

export type UsageResponse = z.infer<typeof usageResponse>;

export type PartnersCount = Record<ProgramEnrollmentStatus | "all", number>;

export type CommissionsCount = Record<
  CommissionStatus | "all",
  {
    count: number;
    amount: number;
    earnings: number;
  }
>;

export type CommissionResponse = z.infer<typeof CommissionEnrichedSchema>;

export type PartnerEarningsResponse = z.infer<typeof PartnerEarningsSchema>;

export type CustomerProps = z.infer<typeof CustomerSchema>;

export type PartnerProps = z.infer<typeof PartnerSchema> & {
  role: PartnerRole;
  userId: string;
};

export type PartnerUserProps = z.infer<typeof partnerUserSchema>;
export type PartnerProfileCustomerProps = z.infer<
  typeof PartnerProfileCustomerSchema
>;

export type PartnerProfileLinkProps = z.infer<typeof PartnerProfileLinkSchema>;

export type EnrolledPartnerProps = z.infer<typeof EnrolledPartnerSchema>;

export type NetworkPartnerProps = z.infer<typeof NetworkPartnerSchema>;

export type PartnerConversionScore = z.infer<
  typeof PartnerConversionScoreSchema
>;

export type EnrolledPartnerExtendedProps = z.infer<
  typeof EnrolledPartnerSchemaExtended
>;

export type DiscountProps = z.infer<typeof DiscountSchema>;

export type DiscountCodeProps = z.infer<typeof DiscountCodeSchema>;

export type ProgramProps = z.infer<typeof ProgramSchema>;

export type ProgramInviteEmailData = z.infer<
  typeof programInviteEmailDataSchema
>;

export type ProgramLanderData = z.infer<typeof programLanderSchema>;

export type ProgramApplicationFormData = z.infer<
  typeof programApplicationFormSchema
>;

export type ProgramApplicationFormDataWithValues = z.infer<
  typeof programApplicationFormDataWithValuesSchema
>;

export type ProgramApplicationFormFieldWithValues = z.infer<
  typeof programApplicationFormFieldWithValuesSchema
>;
export type ProgramEnrollmentProps = z.infer<typeof ProgramEnrollmentSchema>;

export type PayoutsCount = {
  status: PayoutStatus;
  count: number;
  amount: number;
};

export type PayoutResponse = z.infer<typeof PayoutResponseSchema>;

export type PartnerPayoutResponse = z.infer<typeof PartnerPayoutResponseSchema>;

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

export type RewardProps = z.infer<typeof RewardSchema>;

export type CreatePartnerProps = z.infer<typeof createPartnerSchema>;

export type ProgramData = z.infer<typeof programDataSchema>;
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

export type RewardContext = z.infer<typeof rewardContextSchema>;

export type RewardCondition = z.infer<typeof rewardConditionSchema>;

export type RewardConditions = z.infer<typeof rewardConditionsSchema>;

export type RewardConditionsArray = z.infer<typeof rewardConditionsArraySchema>;

export type ClickEventTB = z.infer<typeof clickEventSchemaTB>;

export type LeadEventTB = z.infer<typeof leadEventSchemaTB>;

export type GroupProps = z.infer<typeof GroupSchema>;

export type GroupWithFormDataProps = z.infer<typeof GroupWithFormDataSchema>;

export type GroupWithProgramProps = z.infer<typeof GroupWithProgramSchema>;

export type GroupExtendedProps = z.infer<typeof GroupSchemaExtended>;

export type PartnerGroupDefaultLink = z.infer<
  typeof PartnerGroupDefaultLinkSchema
>;

export type PartnerGroupAdditionalLink = z.infer<
  typeof additionalPartnerLinkSchemaOptionalPath
>;

export type PartnerGroupProps = PartnerGroup & {
  additionalLinks: PartnerGroupAdditionalLink[];
};

export type PartnerCommentProps = z.infer<typeof PartnerCommentSchema>;

export type BountyProps = z.infer<typeof BountySchema>;
export type BountyListProps = z.infer<typeof BountyListSchema>;

export type PartnerBountyProps = z.infer<typeof PartnerBountySchema>;

export type BountySubmissionProps = z.infer<
  typeof BountySubmissionExtendedSchema
>;

export type BountySubmissionRequirement =
  (typeof BOUNTY_SUBMISSION_REQUIREMENTS)[number];

export type WorkflowCondition = z.infer<typeof workflowConditionSchema>;

export type WorkflowConditionAttribute = (typeof WORKFLOW_ATTRIBUTES)[number];

export type WorkflowComparisonOperator =
  (typeof WORKFLOW_COMPARISON_OPERATORS)[number];

export type WorkflowAction = z.infer<typeof workflowActionSchema>;

export type OperatorFn = (a: number, b: number) => boolean;

export interface WorkflowContext {
  programId: string;
  partnerId: string;
  groupId?: string;
  current?: {
    leads?: number;
    conversions?: number;
    saleAmount?: number;
    commissions?: number;
  };
  // Not using at the moment
  historical?: {
    leads?: number;
    conversions?: number;
    saleAmount?: number;
    commissions?: number;
  };
}

export type BountySubmissionsQueryFilters = z.infer<
  typeof getBountySubmissionsQuerySchema
>;

export type Message = z.infer<typeof MessageSchema>;

export type CampaignList = z.infer<typeof CampaignListSchema>;

export type Campaign = z.infer<typeof CampaignSchema>;

export type UpdateCampaignFormData = z.infer<typeof updateCampaignSchema>;

export type CampaignSummary = z.infer<typeof campaignSummarySchema>;

export type StripeMode = "test" | "sandbox" | "live";

export type EmailTemplateVariables = Record<
  (typeof EMAIL_TEMPLATE_VARIABLES)[number],
  string | null | undefined
>;

export interface TiptapNode {
  type: string;
  text?: string;
  attrs?: Record<string, any>;
  content?: TiptapNode[];
  marks?: Array<{ type: string; attrs?: Record<string, any> }>;
}

export interface CampaignWorkflowAttributeConfig {
  label: string;
  inputType: "number" | "currency" | "dropdown" | "none";
  dropdownValues?: number[];
}

export type WorkflowAttribute = (typeof WORKFLOW_ATTRIBUTES)[number];

export type EmailDomainProps = z.infer<typeof EmailDomainSchema>;

export type fraudEventGroupProps = z.infer<typeof groupedFraudEventSchema>;

export type ExtendedFraudRuleType =
  | FraudRuleType
  | "partnerEmailDomainMismatch"
  | "partnerEmailMasked"
  | "partnerNoSocialLinks"
  | "partnerNoVerifiedSocialLinks";

export type FraudSeverity = "low" | "medium" | "high";

export interface FraudTriggeredRule {
  triggered: boolean;
  metadata?: Record<string, unknown>;
}

export interface FraudRuleInfo {
  type: ExtendedFraudRuleType;
  name: string;
  description: string;
  severity?: FraudSeverity;
  configurable: boolean;
  scope: "partner" | "conversionEvent";
}

export type FraudRuleProps = z.infer<typeof fraudRuleSchema>;

export type FraudEventContext = z.infer<typeof fraudEventContext>;

export type PaidTrafficPlatform = (typeof PAID_TRAFFIC_PLATFORMS)[number];

export type UpdateFraudRuleSettings = z.infer<
  typeof updateFraudRuleSettingsSchema
>;

export interface FraudEventsCountByPartner {
  partnerId: string;
  _count: number;
}

export interface FraudEventsCountByType {
  type: FraudRuleType;
  _count: number;
}
