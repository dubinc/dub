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
}

export interface UsageProps {
  usage: number;
  usageLimit: number;
  projectCount?: number;
  lastBilled?: number;
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
