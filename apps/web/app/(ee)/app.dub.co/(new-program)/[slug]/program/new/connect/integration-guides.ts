import { BetterAuth } from "@/ui/layout/sidebar/conversions/icons/better-auth";
import { Clerk } from "@/ui/layout/sidebar/conversions/icons/clerk";
import { Shopify } from "@/ui/layout/sidebar/conversions/icons/shopify";
import { Stripe } from "@/ui/layout/sidebar/conversions/icons/stripe";
import { Supabase } from "@/ui/layout/sidebar/conversions/icons/supabase";
import { Code, Framer, Globe } from "lucide-react";

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

export const guides: IntegrationGuide[] = [
  {
    type: "code",
    key: "react",
    title: "React",
    description: "How to add @dub/analytics to your React or Next.js site",
    shortDescription: "Dub Analytics",
    icon: Code,
  },
  {
    type: "no-code",
    key: "webflow",
    title: "Webflow",
    description: "How to add @dub/analytics to your Webflow site",
    shortDescription: "Dub Analytics",
    icon: Globe,
  },
  {
    type: "code",
    key: "wordpress",
    title: "WordPress",
    description: "How to add @dub/analytics to your WordPress site",
    shortDescription: "Dub Analytics",
    icon: Code,
  },
  {
    type: "no-code",
    key: "framer",
    title: "Framer",
    description: "How to add @dub/analytics to your Framer site",
    shortDescription: "Dub Analytics",
    icon: Framer,
  },
  {
    type: "no-code",
    key: "shopify",
    title: "Shopify",
    description: "How to add @dub/analytics to your Shopify store",
    shortDescription: "Dub Analytics",
    icon: Shopify,
  },
  {
    type: "no-code",
    key: "stripe",
    title: "Stripe",
    description: "How to add @dub/analytics to your Stripe store",
    shortDescription: "Dub Analytics",
    icon: Stripe,
  },
  {
    type: "code",
    key: "clerk",
    title: "Clerk",
    description: "Track lead conversion events with Clerk and Dub",
    shortDescription: "Track leads",
    icon: Clerk,
  },
  {
    type: "code",
    key: "betterauth",
    title: "Better Auth",
    description: "Track lead conversion events with Better Auth and Dub",
    shortDescription: "Track leads",
    icon: BetterAuth,
  },
  {
    type: "code",
    key: "nextauth",
    title: "NextAuth.js",
    description: "Track lead conversion events with NextAuth and Dub",
    shortDescription: "Track leads",
    icon: Code,
  },
  {
    type: "code",
    key: "supabase",
    title: "Supabase",
    description:
      "Learn how to track lead conversion events with Supabase and Dub",
    shortDescription: "Track leads",
    icon: Supabase,
  },
  {
    type: "code",
    key: "auth0",
    title: "Auth0",
    description: "Learn how to track lead conversion events with Auth0 and Dub",
    shortDescription: "Track leads",
    icon: Code,
  },
  {
    type: "code",
    key: "appwrite",
    title: "Appwrite",
    description:
      "Learn how to track lead conversion events with Appwrite and Dub",
    shortDescription: "Track leads",
    icon: Code,
  },
  {
    type: "code",
    key: "manual",
    title: "Manual",
    description: "How to add @dub/analytics to your site",
    shortDescription: "Dub Analytics",
    icon: Code,
  },
];
