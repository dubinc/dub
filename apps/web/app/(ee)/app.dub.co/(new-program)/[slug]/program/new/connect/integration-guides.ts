import { Shopify } from "@/ui/layout/sidebar/conversions/icons/shopify";
import { Code, Framer, Globe } from "lucide-react";

import { IntegrationGuide } from "./types";

export const guides: IntegrationGuide[] = [
  {
    type: "no-code",
    key: "webflow",
    title: "Webflow",
    description: "How to add @dub/analytics to your Webflow site",
    shortDescription: "Dub Analytics",
    icon: Globe,
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
    description: "Dub Analytics",
    shortDescription: "Dub Analytics",
    icon: Shopify,
  },
  {
    type: "code",
    key: "wordpress",
    title: "WordPress",
    description: "Dub Analytics",
    shortDescription: "Dub Analytics",
    icon: Code,
  },
  {
    type: "code",
    key: "react",
    title: "React",
    description: "Dub Analytics",
    shortDescription: "Dub Analytics",
    icon: Code,
  },
];
