export type WorkspaceProps = {
  id: string;
  name: string;
  slug: string;
  usage: number;
  usageLimit: number;
  plan: string;
  defaultProgramId: string | null;
};

export type PartnerPayoutMethod = "connect" | "stablecoin" | "paypal";

// constants
export const STABLECOIN_PAYOUT_FEE_RATE = 0.005;
export const MIN_WITHDRAWAL_AMOUNT_CENTS = 10_00;
export const BELOW_MIN_WITHDRAWAL_FEE_CENTS = 50;
