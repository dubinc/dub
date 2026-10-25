export type WorkspaceProps = {
  id: string;
  name: string;
  slug: string;
  usage: number;
  usageLimit: number;
  plan: string;
};

export type TrialMarketingEmailProps = {
  email: string;
  name?: string | null;
  plan: string;
  workspaceSlug: string;
};
