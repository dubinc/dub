import { Dispatch, SetStateAction } from "react";

export interface LinkProp {
  key: string;
  url: string;
  shortLink: string;
  clicks: number;
  createdAt: Date;
  qrCode: string;
  image?: string;
}

export interface UserProps {
  id: string;
  name: string;
  email: string;
  image?: string;
  createdAt: Date;
  source: string | null;
  migratedWorkspace: string | null;
}

export const tagColors = [
  "red",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "brown",
] as const;

export type TagColorProps = (typeof tagColors)[number];

export interface TagProps {
  id: string;
  name: string;
  color: TagColorProps;
}

export interface JsonArray extends Array<JsonValue> {}
export type JsonValue =
  | string
  | number
  | boolean
  | JsonObject
  | JsonArray
  | null;
export type JsonObject = { [Key in string]?: JsonValue };

interface Link {
  id: string;
  domain: string;
  key: string;
  url: string;
  archived: boolean;
  expiresAt: Date | null;
  expiredUrl: string | null;
  password: string | null;
  externalId: string | null;
  proxy: boolean;
  title: string | null;
  description: string | null;
  image: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  rewrite: boolean;
  ios: string | null;
  android: string | null;
  geo: string | number | boolean | JsonObject | JsonArray | null;
  userId: string | null;
  projectId: string | null;
  publicStats: boolean;
  clicks: number;
  lastClicked: Date | null;
  createdAt: Date;
  updatedAt: Date;
  comments: string | null;
}

export type LinkProps = Link;

export interface ShortLinkProps extends LinkProps {
  tags: TagProps[];
  shortLink: string;
  tagId: null;
  qrCode: string;
  workspaceId: string;
}

export interface LinkWithTagsProps extends LinkProps {
  tags: TagProps[];
}

export interface SectionProps {
  props?: LinkWithTagsProps;
  data: LinkWithTagsProps;
  setData: Dispatch<SetStateAction<LinkWithTagsProps>>;
}

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

export type PlanProps = (typeof plans)[number];

export type RoleProps = (typeof roles)[number];

export interface WorkspaceProps {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  usage: number;
  usageLimit: number;
  aiUsage: number;
  aiLimit: number;
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
}

export interface QRLinkProps {
  domain: string;
  url: string;
  key: string;
}
