import { BetterAuth } from "@/ui/layout/sidebar/conversions/icons/better-auth";
import { Clerk } from "@/ui/layout/sidebar/conversions/icons/clerk";
import { Go } from "@/ui/layout/sidebar/conversions/icons/go";
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
import { Code, Framer, SquareCode } from "lucide-react";

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
    icon: React,
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
    icon: Wordpress,
  },
  {
    type: "client-sdk",
    key: "webflow",
    title: "Webflow",
    icon: Webflow,
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
    icon: SquareCode,
  },

  // Server SDK
  {
    type: "server-sdk",
    key: "typescript",
    title: "TypeScript",
    icon: Typescript,
  },
  {
    type: "server-sdk",
    key: "golang",
    title: "Go",
    icon: Go,
  },
  {
    type: "server-sdk",
    key: "python",
    title: "Python",
    icon: Python,
  },
  {
    type: "server-sdk",
    key: "ruby",
    title: "Ruby",
    icon: Ruby,
  },
  {
    type: "server-sdk",
    key: "php",
    title: "PHP",
    icon: Php,
  },
  {
    type: "server-sdk",
    key: "rest",
    title: "REST API",
    icon: SquareCode,
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
