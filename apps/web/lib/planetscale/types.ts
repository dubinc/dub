export interface EdgeLinkProps {
  id: string;
  domain: string;
  key: string;
  url: string;
  proxy: number;
  title: string;
  description: string;
  image: string;
  video: string;
  rewrite: number;
  password: string | null;
  expiresAt: string | null;
  ios: string | null;
  android: string | null;
  geo: object | null;
  projectId: string;
  publicStats: number;
  expiredUrl: string | null;
  createdAt: string;
}

export interface EdgeDomainProps {
  id: string;
  slug: string;
  verified: number;
  placeholder: string;
  expiredUrl: string | null;
  notFoundUrl: string | null;
  primary: number;
  archived: number;
  projectId: string;
  lastChecked: string;
  createdAt: string;
  updatedAt: string;
}
