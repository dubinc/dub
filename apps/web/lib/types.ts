import z from "@/lib/zod";
import { DirectorySyncProviders } from "@boxyhq/saml-jackson";
import { Link } from "@prisma/client";
import { createLinkBodySchema } from "./zod/schemas/links";

export type LinkProps = Link;

export interface LinkWithTagsProps extends LinkProps {
  tags: TagProps[];
}

export interface LinkWithTagIdsProps extends LinkProps {
  tagIds: string[];
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
  password?: boolean;
  proxy?: boolean;
  rewrite?: boolean;
  iframeable?: boolean;
  expiresAt?: Date;
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

export interface WorkspaceProps {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  usage: number;
  usageLimit: number;
  linksUsage: number;
  linksLimit: number;
  domainsLimit: number;
  tagsLimit: number;
  usersLimit: number;
  plan: PlanProps;
  stripeId: string | null;
  billingCycleStart: number;
  createdAt: Date;
  domains: {
    slug: string;
    primary: boolean;
  }[];
  users: {
    role: RoleProps;
  }[];
  metadata?: {
    defaultDomains?: string[];
  };
  inviteCode: string;
}

export interface UserProps {
  id: string;
  name: string;
  email: string;
  image?: string;
  createdAt: Date;
  role: RoleProps;
  projects?: { projectId: string }[];
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
}
export interface RedisDomainProps {
  id: string;
  url?: string;
  rewrite?: boolean;
  iframeable?: boolean;
  projectId: string;
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
