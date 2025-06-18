import { Shopify } from "@/ui/layout/sidebar/conversions/icons/shopify";
import { Code, Framer, Globe } from "lucide-react";
import { IntegrationGuide } from "./types";
import { Stripe } from "@/ui/layout/sidebar/conversions/icons/stripe";

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
    type: "code",
    key: "manual",
    title: "Manual",
    description: "How to add @dub/analytics to your site",
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
];
