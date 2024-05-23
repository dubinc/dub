export interface LinkProps {
  key: string;
  url: string;
  shortLink: string;
  clicks: number;
  createdAt: Date;
  qrCode: string;
  image?: string;
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