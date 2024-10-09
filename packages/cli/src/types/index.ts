export interface DubConfig {
  access_token: string;
  refresh_token: string | null;
  expires_at: number | null;
  domain?: string;
}

export type Domain = {
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
export interface APIError {
  error: {
    code: string;
    message: string;
    doc_url: string;
  };
}
