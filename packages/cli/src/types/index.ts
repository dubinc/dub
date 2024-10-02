export interface DubConfig {
  key: string;
  domain?: string;
}

export type GetDomain = {
  id: string;
  slug: string;
  verified: boolean;
  primary: boolean;
  archived: boolean;
  placeholder: string;
  expiredUrl: string;
  createdAt: string;
  updatedAt: string;
  registeredDomain: {
    id: string;
    createdAt: string;
    expiresAt: string;
  };
};

export interface CreateLinkProps {
  url: string;
  key?: string;
}

type tag = {
  id: string;
  name: string;
  color: string;
};

type Geo<T = string> = {
  [key: string]: T;
};

export type GetLink = {
  id: string;
  domain: string;
  key: string;
  externalId: string;
  url: string;
  trackConversion: boolean;
  archived: boolean;
  expiresAt: string;
  expiredUrl: string;
  password: string;
  proxy: boolean;
  title: string;
  description: string;
  image: string;
  video: string;
  rewrite: boolean;
  doIndex: boolean;
  ios: string;
  android: string;
  geo: Geo;
  publicStats: boolean;
  tagId: string;
  tags: tag[];
  comments: string;
  shortLink: string;
  qrCode: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
  userId: string;
  workspaceId: string;
  clicks: number;
  lastClicked: string;
  leads: number;
  sales: number;
  saleAmount: number;
  createdAt: string;
  updatedAt: string;
  projectId: string;
};

export interface APIError {
  error: {
    code: string;
    message: string;
    doc_url: string;
  };
}
