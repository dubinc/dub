import { Logo } from "#/ui/icons";
import { allHelpPosts } from "contentlayer/generated";
import { Globe, Import, Link2, Lock, Settings, Webhook } from "lucide-react";

export const BLOG_CATEGORIES: {
  title: string;
  slug: "company" | "education" | "customer-stories";
  description: string;
}[] = [
  {
    title: "Company News",
    slug: "company",
    description: "Updates and announcements from Dub.",
  },
  // {
  //   title: "Education",
  //   slug: "education",
  //   description: "Educational content about link management.",
  // },
  // {
  //   title: "Customer Stories",
  //   slug: "customer-stories",
  //   description: "Learn how Dub customers use Dub.",
  // },
];

export const POPULAR_ARTICLES = [
  "what-is-dub",
  "what-is-a-project",
  "how-to-add-custom-domain",
  "how-to-use-tags",
  "how-to-invite-teammates",
  "pro-plan",
];

export const HELP_CATEGORIES: {
  title: string;
  slug:
    | "overview"
    | "getting-started"
    | "link-management"
    | "custom-domains"
    | "migrating"
    | "api"
    | "saml-sso";
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
    title: "Migrating to Dub",
    slug: "migrating",
    description: "Easily migrate to Dub from other services.",
    icon: <Import className="h-6 w-6 text-gray-500" />,
  },
  {
    title: "SAML SSO",
    slug: "saml-sso",
    description: "Secure your Dub project with SAML SSO.",
    icon: <Lock className="h-6 w-6 text-gray-500" />,
  },
  {
    title: "API",
    slug: "api",
    description: "Learn how to use the Dub API.",
    icon: <Webhook className="h-6 w-6 text-gray-500" />,
  },
];

export const getPopularArticles = () => {
  return POPULAR_ARTICLES.map(
    (slug) => allHelpPosts.find((post) => post.slug === slug)!,
  );
};

export const features = [
  {
    title: "Powerful Analytics for the Modern Marketer",
    shortTitle: "Advanced Analytics",
    slug: "analytics",
  },
  {
    title: "Branded Links that Stand Out",
    shortTitle: "Branded Links",
    slug: "branded-links",
  },
  { title: "Custom QR Codes", shortTitle: "QR Codes", slug: "qr-codes" },
  {
    title: "Personalize Your Link's Behavior",
    seoTitle: "Personalize Your Link's Behavior with Device and Geo Targeting",
    shortTitle: "Personalization",
    slug: "personalization",
  },
  { title: "Programmatic Link Creation", shortTitle: "API", slug: "api" },
  {
    title: "Collaborate With Your Team",
    shortTitle: "Team collaboration",
    slug: "collaboration",
  },
];
