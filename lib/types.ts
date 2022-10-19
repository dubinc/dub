export interface SimpleLinkProps {
  key: string;
  url: string;
}

export interface LinkProps {
  id?: string;
  domain: string;
  key: string;
  url: string;
  archived: boolean;
  expiresAt: Date | null;
  password: string | null;

  title: string | null;
  description: string | null;
  image: string | null;

  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;

  clicks: number;
  userId: string;

  createdAt: Date;
}

export interface ProjectProps {
  name: string;
  slug: string;
  domain: string;
  domainVerified: boolean;
  logo?: string;
  ownerUsageLimit?: number;
  ownerExceededUsage?: boolean;
  users?: {
    role: string;
  }[];
}

export interface UsageProps {
  usage: number;
  usageLimit: number;
  projectCount?: number;
  billingCycleStart?: number;
  ownerUsageLimit?: number;
  ownerExceededUsage?: boolean;
}

export interface UserProps {
  id: string;
  name: string;
  email: string;
  stripeId: string;
  usageLimit: number;
  projects?: { projectId: string }[];
}

export type DomainVerificationStatusProps =
  | "Valid Configuration"
  | "Invalid Configuration"
  | "Pending Verification"
  | "Domain Not Found"
  | "Unknown Error";
