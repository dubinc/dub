export type IntegrationType = "no-code" | "code";

export type IntegrationGuide = {
  type: IntegrationType;
  title: string;
  description?: string;
  icon: JSX.Element;
  recommended?: boolean;
};
