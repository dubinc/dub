import { BetterAuth } from "@/ui/layout/sidebar/conversions/icons/better-auth";
import { Clerk } from "@/ui/layout/sidebar/conversions/icons/clerk";
import { Shopify } from "@/ui/layout/sidebar/conversions/icons/shopify";
import { Stripe } from "@/ui/layout/sidebar/conversions/icons/stripe";
import { Supabase } from "@/ui/layout/sidebar/conversions/icons/supabase";
import { Code, Framer, Globe } from "lucide-react";

export type IntegrationType =
  | "client-sdk"
  | "server-sdk"
  | "track-leads"
  | "track-sales";

export type IntegrationGuide = {
  type: IntegrationType;
  key: string;
  title: string;
  description?: string;
  icon: any;
  recommended?: boolean;
  content?: string;
};

export const guides: IntegrationGuide[] = [
  // Client SDK
  {
    type: "client-sdk",
    key: "react",
    title: "React",
    icon: Code,
  },
  {
    type: "client-sdk",
    key: "framer",
    title: "Framer",
    icon: Framer,
  },
  {
    type: "client-sdk",
    key: "wordpress",
    title: "WordPress",
    icon: Code,
  },
  {
    type: "client-sdk",
    key: "webflow",
    title: "Webflow",
    icon: Globe,
  },
  {
    type: "client-sdk",
    key: "shopify",
    title: "Shopify",
    icon: Shopify,
  },
  {
    type: "client-sdk",
    key: "manual",
    title: "Manual",
    icon: Code,
  },

  // Server SDK
  {
    type: "server-sdk",
    key: "typescript",
    title: "TypeScript",
    icon: Code,
  },
  {
    type: "server-sdk",
    key: "golang",
    title: "Go",
    icon: Code,
  },
  {
    type: "server-sdk",
    key: "python",
    title: "Python",
    icon: Code,
  },
  {
    type: "server-sdk",
    key: "ruby",
    title: "Ruby",
    icon: Code,
  },
  {
    type: "server-sdk",
    key: "php",
    title: "PHP",
    icon: Code,
  },
  {
    type: "server-sdk",
    key: "rest",
    title: "REST API",
    icon: Code,
  },

  // Track Leads
  {
    type: "track-leads",
    key: "clerk",
    title: "Clerk",
    icon: Clerk,
  },
  {
    type: "track-leads",
    key: "betterauth",
    title: "Better Auth",
    icon: BetterAuth,
  },
  {
    type: "track-leads",
    key: "nextauth",
    title: "NextAuth.js",
    icon: Code,
  },
  {
    type: "track-leads",
    key: "supabase",
    title: "Supabase",
    icon: Supabase,
  },
  {
    type: "track-leads",
    key: "auth0",
    title: "Auth0",
    icon: Code,
  },
  {
    type: "track-leads",
    key: "appwrite",
    title: "Appwrite",
    icon: Code,
  },
  {
    type: "track-leads",
    key: "segment-track-leads",
    title: "Segment",
    icon: Code,
  },

  // Track Sales
  {
    type: "track-sales",
    key: "stripe-checkout",
    title: "Stripe",
    description: "Checkout",
    icon: Stripe,
  },
  {
    type: "track-sales",
    key: "stripe-payment-links",
    title: "Stripe",
    description: "Payment Links",
    icon: Stripe,
  },
  {
    type: "track-sales",
    key: "stripe",
    title: "Stripe",
    description: "Customers",
    icon: Stripe,
  },
  {
    type: "track-sales",
    key: "segment-track-sales",
    title: "Segment",
    icon: Code,
  },
];
