export type IntegrationType = "no-code" | "code";

export type IntegrationGuide = {
  type: IntegrationType;
  key: string;
  title: string;
  description: string; 
  shortDescription: string;
  icon: any;
  recommended?: boolean;
  content?: string;
};
