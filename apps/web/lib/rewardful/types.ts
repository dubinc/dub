export interface RewardfulLink {
  id: string;
  url: string;
  token: string;
  visitors: number;
  leads: number;
  conversions: number;
}

export interface RewardfulCustomer {
  id: string;
  name: string;
  email: string;
  platform: string;
}

export interface Campaign {
  id: string;
  name: string;
  affiliates: number;
  created_at: string;
  updated_at: string;
}

export interface RewardfulAffiliate {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  state: string;
  visitors: number;
  leads: number;
  conversions: number;
  created_at: string;
  updated_at: string;
  links: RewardfulLink[];
}

export interface RewardfulReferral {
  id: string;
  link: RewardfulLink;
  customer: RewardfulCustomer;
  affiliate: RewardfulAffiliate;
  created_at: string;
  became_lead_at: string;
  became_conversion_at: string;
  expires_at: string;
  updated_at: string;
  conversion_state: string;
  stripe_customer_id: string;
}
