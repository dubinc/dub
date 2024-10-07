export interface DubConfig {
  token: string;
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
