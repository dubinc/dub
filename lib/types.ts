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
  expiresAt?: Date;
  password?: string;

  title?: string;
  description?: string;
  image?: string;

  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;

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
