export interface PartnerStackConfig {
  token: string;
}

export interface PartnerStackListResponse<T> {
  success: true;
  total_count: number;
  data: T[];
}

// Basic types - these will be expanded as we implement the API
export interface PartnerStackAffiliate {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  company_name?: string;
  country_code?: string;
  profile_type?: string;
  created_at: string;
}

export interface PartnerStackLink {
  id: string;
  tracking_url: string;
  token: string;
  partner_id: string;
  created_at: string;
}

export interface PartnerStackReferral {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  company_name?: string;
  partner_id: string;
  created_at: string;
}

export interface PartnerStackCommission {
  id: string;
  amount: number;
  commission_amount: number;
  status: string;
  partner_id: string;
  customer_id: string;
  created_at: string;
}
