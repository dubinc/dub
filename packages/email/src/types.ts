export type WorkspaceProps = {
  id: string;
  name: string;
  slug: string;
  usage: number;
  usageLimit: number;
  plan: string;
};

export type PaymentMethod = "card" | "ach" | "ach_fast" | "sepa" | "acss";
