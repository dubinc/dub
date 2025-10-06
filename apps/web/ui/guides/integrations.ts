import { Appwrite } from "@/ui/guides/icons/appwrite";
import { Auth0 } from "@/ui/guides/icons/auth0";
import { BetterAuth } from "@/ui/guides/icons/better-auth";
import { Clerk } from "@/ui/guides/icons/clerk";
import { CodeEditor } from "@/ui/guides/icons/code-editor";
import { Framer } from "@/ui/guides/icons/framer";
import { GoogleTagManager } from "@/ui/guides/icons/gtm";
import { NextAuth } from "@/ui/guides/icons/next-auth";
import { React } from "@/ui/guides/icons/react";
import { Segment } from "@/ui/guides/icons/segment";
import { Shopify } from "@/ui/guides/icons/shopify";
import { Stripe } from "@/ui/guides/icons/stripe";
import { Supabase } from "@/ui/guides/icons/supabase";
import { Webflow } from "@/ui/guides/icons/webflow";
import { Wordpress } from "@/ui/guides/icons/wordpress";

export type IntegrationType = "client-sdk" | "track-lead" | "track-sale";

export type IntegrationGuide = {
  type: IntegrationType;
  key: string;
  title: string;
  description?: string;
  subtitle?: string;
  icon: any;
  iconProps?: {
    fullSize?: boolean;
  };
  recommended?: boolean;
  content?: string;
  url: string;
};

export type IntegrationGuideWithMarkdown = IntegrationGuide & {
  markdown: string | null;
};

export const sections: {
  type: IntegrationType;
  title: string;
  description: string;
}[] = [
  {
    type: "client-sdk",
    title: "Install client-side script",
    description:
      "First, you need to install Dub's client-side script, which enables Dub to track click events and store them as a first-party cookie on your site.",
  },
  {
    type: "track-lead",
    title: "Track lead events",
    description:
      "Then, you'll track a lead event (e.g. when a user signs up for an account on your application) using our server-side SDKs or REST API.",
  },
  {
    type: "track-sale",
    title: "Track sale events",
    description:
      "Finally, you can use our Stripe integration or server-side SDKs to track sale events (e.g. when a user purchases a product on your application).",
  },
];

export const guides: IntegrationGuide[] = [
  // Client SDK
  {
    type: "client-sdk",
    key: "react",
    title: "React",
    icon: React,
    url: "https://dub.co/docs/sdks/client-side/installation-guides/react",
  },
  {
    type: "client-sdk",
    key: "gtm-client-sdk",
    title: "Google Tag Manager",
    icon: GoogleTagManager,
    url: "https://dub.co/docs/sdks/client-side/installation-guides/google-tag-manager",
  },
  {
    type: "client-sdk",
    key: "framer",
    title: "Framer",
    icon: Framer,
    url: "https://dub.co/docs/sdks/client-side/installation-guides/framer",
  },
  {
    type: "client-sdk",
    key: "shopify",
    title: "Shopify",
    icon: Shopify,
    url: "https://dub.co/docs/sdks/client-side/installation-guides/shopify",
  },
  {
    type: "client-sdk",
    key: "wordpress",
    title: "WordPress",
    icon: Wordpress,
    url: "https://dub.co/docs/sdks/client-side/installation-guides/wordpress",
  },
  {
    type: "client-sdk",
    key: "webflow",
    title: "Webflow",
    icon: Webflow,
    url: "https://dub.co/docs/sdks/client-side/installation-guides/webflow",
  },
  {
    type: "client-sdk",
    key: "manual-client-sdk",
    title: "Manual Installation",
    description: "Manual Installation",
    icon: CodeEditor,
    url: "https://dub.co/docs/sdks/client-side/installation-guides/manual",
  },

  // Track Leads
  {
    type: "track-lead",
    key: "segment-track-lead",
    title: "Segment",
    icon: Segment,
    url: "https://dub.co/docs/conversions/leads/segment",
  },
  {
    type: "track-lead",
    key: "gtm-track-lead",
    title: "Google Tag Manager",
    icon: GoogleTagManager,
    url: "https://dub.co/docs/conversions/leads/google-tag-manager",
  },
  {
    type: "track-lead",
    key: "clerk",
    title: "Clerk",
    icon: Clerk,
    url: "https://dub.co/docs/conversions/leads/clerk",
  },
  {
    type: "track-lead",
    key: "better-auth",
    title: "Better Auth",
    icon: BetterAuth,
    url: "https://dub.co/docs/conversions/leads/better-auth",
  },
  {
    type: "track-lead",
    key: "next-auth",
    title: "NextAuth.js",
    icon: NextAuth,
    url: "https://dub.co/docs/conversions/leads/next-auth",
  },
  {
    type: "track-lead",
    key: "supabase",
    title: "Supabase",
    icon: Supabase,
    url: "https://dub.co/docs/conversions/leads/supabase",
  },
  {
    type: "track-lead",
    key: "auth0",
    title: "Auth0",
    icon: Auth0,
    url: "https://dub.co/docs/conversions/leads/auth0",
  },
  {
    type: "track-lead",
    key: "appwrite",
    title: "Appwrite",
    icon: Appwrite,
    url: "https://dub.co/docs/conversions/leads/appwrite",
  },
  {
    type: "track-lead",
    key: "manual-track-lead",
    title: "Custom Integration",
    description: "Manual Lead Tracking",
    icon: CodeEditor,
    url: "https://dub.co/docs/conversions/leads/introduction",
  },

  // Track Sales
  {
    type: "track-sale",
    key: "stripe-checkout",
    title: "Stripe",
    subtitle: "Checkout",
    recommended: true,
    description: "Stripe Checkout",
    icon: Stripe,
    iconProps: {
      fullSize: true,
    },
    url: "https://dub.co/docs/conversions/sales/stripe#option-2%3A-using-stripe-checkout-recommended",
  },
  {
    type: "track-sale",
    key: "stripe-payment-links",
    title: "Stripe",
    subtitle: "Payment Links",
    description: "Stripe Payment Links",
    icon: Stripe,
    iconProps: {
      fullSize: true,
    },
    url: "https://dub.co/docs/conversions/sales/stripe#option-1%3A-using-stripe-payment-links",
  },
  {
    type: "track-sale",
    key: "stripe-customers",
    title: "Stripe",
    subtitle: "Customers",
    description: "Stripe Customers",
    icon: Stripe,
    iconProps: {
      fullSize: true,
    },
    url: "https://dub.co/docs/conversions/sales/stripe#option-3%3A-using-stripe-customers",
  },
  {
    type: "track-sale",
    key: "segment-track-sale",
    title: "Segment",
    icon: Segment,
    url: "https://dub.co/docs/conversions/sales/segment",
  },
  {
    type: "track-sale",
    key: "gtm-track-sale",
    title: "Google Tag Manager",
    icon: GoogleTagManager,
    url: "https://dub.co/docs/conversions/sales/google-tag-manager",
  },
  {
    type: "track-sale",
    key: "manual-track-sale",
    title: "Custom Integration",
    description: "Manual Sale Tracking",
    icon: CodeEditor,
    url: "https://dub.co/docs/conversions/sales/introduction",
  },
];
