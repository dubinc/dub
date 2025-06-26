import { Appwrite } from "@/ui/layout/sidebar/conversions/icons/appwrite";
import { Auth0 } from "@/ui/layout/sidebar/conversions/icons/auth0";
import { BetterAuth } from "@/ui/layout/sidebar/conversions/icons/better-auth";
import { Clerk } from "@/ui/layout/sidebar/conversions/icons/clerk";
import { Framer } from "@/ui/layout/sidebar/conversions/icons/framer";
import { Go } from "@/ui/layout/sidebar/conversions/icons/go";
import { NextAuth } from "@/ui/layout/sidebar/conversions/icons/next-auth";
import { Php } from "@/ui/layout/sidebar/conversions/icons/php";
import { Python } from "@/ui/layout/sidebar/conversions/icons/python";
import { React } from "@/ui/layout/sidebar/conversions/icons/react";
import { Ruby } from "@/ui/layout/sidebar/conversions/icons/ruby";
import { Shopify } from "@/ui/layout/sidebar/conversions/icons/shopify";
import { Stripe } from "@/ui/layout/sidebar/conversions/icons/stripe";
import { Supabase } from "@/ui/layout/sidebar/conversions/icons/supabase";
import { Typescript } from "@/ui/layout/sidebar/conversions/icons/typescript";
import { Webflow } from "@/ui/layout/sidebar/conversions/icons/webflow";
import { Wordpress } from "@/ui/layout/sidebar/conversions/icons/wordpress";
import { CodeEditor } from "../layout/sidebar/conversions/icons/code-editor";

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
  url: string;
};

export const sections: {
  type: IntegrationType;
  title: string;
  description: string;
}[] = [
  {
    type: "client-sdk",
    title: "Set up client-side script",
    description:
      "The step allows Dub to track clicks, automatically fetch the partner and discount data for a given link. Select the guide for instructions.",
  },
  {
    type: "server-sdk",
    title: "Set up server-side SDK",
    description:
      "Install the server-side SDK of your choice and select the guide for instructions.",
  },
  {
    type: "track-leads",
    title: "Track lead events",
    description:
      "The step allows your app to send lead events to Dub. Select the guide for instructions.",
  },
  {
    type: "track-sales",
    title: "Track sale events",
    description:
      "The step allows your app to send sale events to Dub. Select the guide for instructions.",
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
    key: "framer",
    title: "Framer",
    icon: Framer,
    url: "https://dub.co/docs/sdks/client-side/installation-guides/framer",
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
    key: "shopify",
    title: "Shopify",
    icon: Shopify,
    url: "https://dub.co/docs/sdks/client-side/installation-guides/shopify",
  },
  {
    type: "client-sdk",
    key: "manual-client-sdk",
    title: "Manual",
    description: "manual installation",
    icon: CodeEditor,
    url: "https://dub.co/docs/sdks/client-side/installation-guides/manual",
  },

  // Server SDK
  {
    type: "server-sdk",
    key: "typescript",
    title: "TypeScript",
    icon: Typescript,
    url: "https://dub.co/docs/sdks/typescript",
  },
  {
    type: "server-sdk",
    key: "golang",
    title: "Go",
    icon: Go,
    url: "https://dub.co/docs/sdks/go",
  },
  {
    type: "server-sdk",
    key: "python",
    title: "Python",
    icon: Python,
    url: "https://dub.co/docs/sdks/python",
  },
  {
    type: "server-sdk",
    key: "ruby",
    title: "Ruby",
    icon: Ruby,
    url: "https://dub.co/docs/sdks/ruby",
  },
  {
    type: "server-sdk",
    key: "php",
    title: "PHP",
    icon: Php,
    url: "https://dub.co/docs/sdks/php",
  },
  {
    type: "server-sdk",
    key: "rest-api",
    title: "REST API",
    icon: CodeEditor,
    url: "https://dub.co/docs/api-reference/introduction",
  },

  // Track Leads
  {
    type: "track-leads",
    key: "clerk",
    title: "Clerk",
    icon: Clerk,
    url: "https://dub.co/docs/conversions/leads/clerk",
  },
  {
    type: "track-leads",
    key: "betterauth",
    title: "Better Auth",
    icon: BetterAuth,
    url: "https://dub.co/docs/conversions/leads/better-auth",
  },
  {
    type: "track-leads",
    key: "nextauth",
    title: "NextAuth.js",
    icon: NextAuth,
    url: "https://dub.co/docs/conversions/leads/nextauth",
  },
  {
    type: "track-leads",
    key: "supabase",
    title: "Supabase",
    icon: Supabase,
    url: "https://dub.co/docs/conversions/leads/supabase",
  },
  {
    type: "track-leads",
    key: "auth0",
    title: "Auth0",
    icon: Auth0,
    url: "https://dub.co/docs/conversions/leads/auth0",
  },
  {
    type: "track-leads",
    key: "appwrite",
    title: "Appwrite",
    icon: Appwrite,
    url: "https://dub.co/docs/conversions/leads/appwrite",
  },
  {
    type: "track-leads",
    key: "manual-track-leads",
    title: "Manual",
    description: "manual lead tracking",
    icon: CodeEditor,
    url: "https://dub.co/docs/api-reference/endpoint/track-lead",
  },
  // {
  //   type: "track-leads",
  //   key: "segment-track-leads",
  //   title: "Segment",
  //   icon: Segment,
  // },

  // Track Sales
  {
    type: "track-sales",
    key: "stripe-checkout",
    title: "Stripe",
    description: "Checkout",
    icon: Stripe,
    url: "https://dub.co/docs/conversions/sales/stripe#option-2%3A-using-stripe-checkout-recommended",
  },
  {
    type: "track-sales",
    key: "stripe-payment-links",
    title: "Stripe",
    description: "Payment Links",
    icon: Stripe,
    url: "https://dub.co/docs/conversions/sales/stripe#option-1%3A-using-stripe-payment-links",
  },
  {
    type: "track-sales",
    key: "stripe-customers",
    title: "Stripe",
    description: "Customers",
    icon: Stripe,
    url: "https://dub.co/docs/conversions/sales/stripe#option-3%3A-using-stripe-customers",
  },
  {
    type: "track-sales",
    key: "manual-track-sales",
    title: "Manual",
    description: "manual sale tracking",
    icon: CodeEditor,
    url: "https://dub.co/docs/api-reference/endpoint/track-sale",
  },
  // {
  //   type: "track-sales",
  //   key: "segment-track-sales",
  //   title: "Segment",
  //   icon: Segment,
  // },
];
