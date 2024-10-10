export interface DubConfig {
  access_token: string;
  refresh_token: string | null;
  expires_at: number | null;
  domain?: string;
}

export interface APIError {
  error: {
    code: string;
    message: string;
    doc_url: string;
  };
}
