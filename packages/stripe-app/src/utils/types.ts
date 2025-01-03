export interface Token {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export interface Workspace {
  id: string;
  name: string;
  logo: string;
}

export type StripeMode = "test" | "live";
