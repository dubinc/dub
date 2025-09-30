export type PricingPlan = {
  badge: string;
  title: string;
  plan: string;
  planFeatures: string[];
  withButton?: boolean;
};

export const PRICING_PLANS: PricingPlan[] = [
  {
    badge: "7-Day Trial",
    title: "Get Started",
    plan: "$0.99/ 7 days",
    planFeatures: [
      "Unlimited QR codes",
      "Advanced analytics",
      "Full customization",
    ],
    withButton: true,
  },
  {
    badge: "Most Flexible",
    title: "Monthly",
    plan: "$39.99/month",
    planFeatures: [
      "Unlimited QR codes",
      "Advanced analytics",
      "Full customization",
    ],
  },
  {
    badge: "Save 15%",
    title: "Quarterly",
    plan: "$29.99/month",
    planFeatures: [
      "Unlimited QR codes",
      "Advanced analytics",
      "Full customization",
    ],
  },
  {
    badge: "Save 30%",
    title: "Annual",
    plan: "$19.99/month",
    planFeatures: [
      "Unlimited QR codes",
      "Advanced analytics",
      "Full customization",
    ],
  },
];
