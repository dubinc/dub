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
