export interface SimpleLinkProps {
  key: string;
  url: string;
}

export interface LinkProps {
  key: string;
  url: string;
  title: string;
  timestamp?: number;
  description?: string;
  image?: string;
}

export interface ProjectProps {
  name: string;
  slug: string;
  domain: string;
  domainVerified: boolean;
  plan: string;
  usageLimit: number;
  stripeId?: string;
  lastBilled: Date;
}

export type DomainVerificationStatusProps =
  | "Valid Configuration"
  | "Invalid Configuration"
  | "Pending Verification"
  | "Domain Not Found";
