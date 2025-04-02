export interface RewardfulConfig {
  token: string;
  userId: string;
  campaignId: string;
}

export interface RewardfulCampaign {
  id: string;
  name: string;
  url: string;
  affiliates: number;
  commission_amount_cents: number;
  minimum_payout_cents: number;
  max_commission_period_months: number;
  days_until_commissions_are_due: number;
  reward_type: "amount" | "percent";
  commission_percent: number;
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
  campaign?: RewardfulCampaign;
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

export interface RewardfulCommissionSale {
  id: string;
  currency: string;
  charged_at: string;
  stripe_account_id: string;
  stripe_charge_id: string;
  invoiced_at: string;
  created_at: string;
  updated_at: string;
  charge_amount_cents: number;
  refund_amount_cents: number;
  tax_amount_cents: number;
  sale_amount_cents: number;
  referral: RewardfulReferral;
  affiliate: RewardfulAffiliate;
}

export interface RewardfulCommission {
  id: string;
  created_at: string;
  updated_at: string;
  amount: number;
  currency: string;
  state: "pending" | "due" | "paid" | "voided";
  due_at: string;
  paid_at: string | null;
  voided_at: string | null;
  campaign: RewardfulCampaign;
  sale: RewardfulCommissionSale;
}
