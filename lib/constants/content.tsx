import { Logo } from "#/ui/icons";
import { Globe, Link2, Settings, Webhook } from "lucide-react";

export const POPULAR_ARTICLES = [
  "what-is-dub",
  "what-is-a-project",
  "how-to-add-custom-domain",
  "how-to-use-tags",
  "how-to-invite-teammates",
  "pro-plan",
];

export const CATEGORIES: {
  title: string;
  slug:
    | "overview"
    | "getting-started"
    | "link-management"
    | "custom-domains"
    | "api";
  description: string;
  icon: JSX.Element;
}[] = [
  {
    title: "Dub Overview",
    slug: "overview",
    description: "Learn about Dub and how it can help you.",
    icon: <Logo className="h-6 w-6 text-gray-500" />,
  },
  {
    title: "Getting Started",
    slug: "getting-started",
    description: "Learn how to get started with Dub.",
    icon: <Settings className="h-6 w-6 text-gray-500" />,
  },
  {
    title: "Link Management",
    slug: "link-management",
    description: "Learn how to manage your links on Dub.",
    icon: <Link2 className="h-6 w-6 text-gray-500" />,
  },
  {
    title: "Custom Domains",
    slug: "custom-domains",
    description: "Learn how to use custom domains with Dub.",
    icon: <Globe className="h-6 w-6 text-gray-500" />,
  },
  {
    title: "API",
    slug: "api",
    description: "Learn how to use the Dub API.",
    icon: <Webhook className="h-6 w-6 text-gray-500" />,
  },
];
