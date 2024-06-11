import z from "@/lib/zod";
import { metaTagsSchema } from "@/lib/zod/schemas/metatags";
import { DirectorySyncProviders } from "@boxyhq/saml-jackson";
import { Link, Project } from "@prisma/client";
import { createLinkBodySchema } from "./zod/schemas/links";

export type LinkProps = Link;

export interface LinkWithTagsProps extends LinkProps {
  tags: TagProps[];
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
  url: string;
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
  projectId?: string;
}

export interface EdgeLinkProps {
  id: string;
  domain: string;
  key: string;
  url: string;
  proxy: boolean;
  title: string;
  description: string;
  image: string;
  password: string;
  clicks: number;
  publicStats: boolean;
  userId: string;
  projectId: string;
}

export interface TagProps {
  id: string;
  name: string;
  color: TagColorProps;
}

export type TagColorProps = (typeof tagColors)[number];

export type PlanProps = (typeof plans)[number];

export type RoleProps = (typeof roles)[number];

export interface WorkspaceProps extends Project {
  plan: PlanProps;
  stripeId: string | null;
  billingCycleStart: number;
  stripeConnectId: string | null;
  createdAt: Date;
  domains: {
    slug: string;
    primary: boolean;
  }[];
  users: {
    role: RoleProps;
  }[];
  inviteCode: string;
  betaTester?: boolean;
}

export interface UserProps {
  id: string;
  name: string;
  email: string;
  image?: string;
  createdAt: Date;
  source: string | null;
  migratedWorkspace: string | null;
  defaultWorkspace?: string;
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
  publicStats: boolean;
  target?: string;
  type: string;
  placeholder?: string;
  clicks: number;
  projectId: string;
  expiredUrl?: string;
  noindex?: boolean;
}
export interface RedisDomainProps {
  id: string;
  url?: string;
  rewrite?: boolean;
  iframeable?: boolean;
  projectId: string;
  noindex?: boolean;
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
  Pick<LinkProps, ProcessedLinkOverrides> & { userId?: LinkProps["userId"] };

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
