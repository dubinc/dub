export interface RewardfulConfig {
  token: string;
  userId: string;
  campaignId: string;
}

export interface RewardfulCampaign {
  id: string;
  name: string;
  affiliates: number;
  commission_amount_cents: number;
  max_commission_period_months: number;
  reward_type: string;
  commission_percent: number;
  // stripe_coupon_id: string;
  created_at: string;
  updated_at: string;
}

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
