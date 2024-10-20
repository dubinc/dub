import z from "@/lib/zod";
import { metaTagsSchema } from "@/lib/zod/schemas/metatags";
import { DirectorySyncProviders } from "@boxyhq/saml-jackson";
import { Link, Project, UtmTemplate, Webhook } from "@prisma/client";
import { WEBHOOK_TRIGGER_DESCRIPTIONS } from "./webhook/constants";
import { trackCustomerResponseSchema } from "./zod/schemas/customers";
import { integrationSchema } from "./zod/schemas/integration";
import { trackLeadResponseSchema } from "./zod/schemas/leads";
import { createLinkBodySchema } from "./zod/schemas/links";
import { createOAuthAppSchema, oAuthAppSchema } from "./zod/schemas/oauth";
import { trackSaleResponseSchema } from "./zod/schemas/sales";
import { tokenSchema } from "./zod/schemas/token";
import { usageResponse } from "./zod/schemas/usage";
import {
  createWebhookSchema,
  webhookEventSchemaTB,
  webhookSchema,
} from "./zod/schemas/webhooks";

export type LinkProps = Link;

export interface LinkWithTagsProps extends LinkProps {
  tags: TagProps[];
  webhookIds: string[];
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
  iframeable?: boolean;
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

export type BetaFeatures = "callink" | "referrals" | "webhooks";

export type AddOns = "conversion" | "sso";

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
}

export type WorkspaceWithUsers = Omit<WorkspaceProps, "domains">;

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
  "id" | "slug" | "logo" | "name" | "developer" | "description" | "verified"
> & {
  installations: number;
  installed?: boolean;
};

export type InstalledIntegrationInfoProps = Pick<
  IntegrationProps,
  | "id"
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
      image: string | null;
    };
  } | null;
  credentials?: Record<string, string>;
};

export type WebhookTrigger = keyof typeof WEBHOOK_TRIGGER_DESCRIPTIONS;

export type WebhookProps = z.infer<typeof webhookSchema>;

export type NewWebhook = z.infer<typeof createWebhookSchema>;

export type WebhookEventProps = z.infer<typeof webhookEventSchemaTB>;

export type WebhookCacheProps = Pick<
  Webhook,
  "id" | "url" | "secret" | "triggers" | "disabledAt"
>;

export type TrackCustomerResponse = z.infer<typeof trackCustomerResponseSchema>;

export type TrackLeadResponse = z.infer<typeof trackLeadResponseSchema>;

export type TrackSaleResponse = z.infer<typeof trackSaleResponseSchema>;

export type UsageResponse = z.infer<typeof usageResponse>;
