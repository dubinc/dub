import { Logo } from "#/ui/icons";
import { allHelpPosts } from "contentlayer/generated";
import {
  Airplay,
  BarChart,
  Globe,
  Import,
  Link2,
  Lock,
  QrCode,
  Settings,
  Users,
  Webhook,
} from "lucide-react";

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

export const FEATURES_LIST = [
  {
    title: "Powerful analytics for the modern marketer",
    shortTitle: "Advanced Analytics",
    accordionTitle: "Analytics that matter",
    description:
      "Dub provides powerful analytics for your links, including geolocation, device, browser, and referrer information.",
    icon: BarChart,
    slug: "analytics",
    thumbnail:
      "https://media.cleanshot.cloud/media/42580/FUSjMlxa2Xqne98F9KO5i960094hS5XinPIfgC9r.jpeg?Expires=1693806001&Signature=H5-txoTKREO1I7R-X05XDKQK2lS6EdMjnmb5MSTgfAsx-cJ4gXipCu99TZxJovoFGyBy2yLnVn3WrBhRtr~XkAhk0REtXrtLCpRe~dy0WJymLacZ-joGNIT203o5TptMueNAhWJIzdURsVJTl7VkU94BFHKCt31am8UuAIm8hh-ZI3YnjIteS9lNe4c2AJ2c6pDecNLjdG8OG6VeddSW29Lgehqdx4c3qKSTSbaL8fH0Hn-ez4spG4iHBgOXerY1R2kvaVaxjY6qN1OFZ9dWjiDIFAGo~MggxxNn8zSKwJHTtCqzKG9EYP-dozIjb-kmmlao0eolGHi1bh9tVUofuA__&Key-Pair-Id=K269JMAT9ZF4GZ",
  },
  {
    title: "Branded Links that Stand Out",
    shortTitle: "Branded Links",
    accordionTitle: "Use your own domain",
    description:
      "Dub offers free and unlimited custom domains on all plans for you to create branded links that stand out.",
    icon: Airplay,
    slug: "branded-links",
    thumbnail:
      "https://media.cleanshot.cloud/media/42580/FUSjMlxa2Xqne98F9KO5i960094hS5XinPIfgC9r.jpeg?Expires=1693806001&Signature=H5-txoTKREO1I7R-X05XDKQK2lS6EdMjnmb5MSTgfAsx-cJ4gXipCu99TZxJovoFGyBy2yLnVn3WrBhRtr~XkAhk0REtXrtLCpRe~dy0WJymLacZ-joGNIT203o5TptMueNAhWJIzdURsVJTl7VkU94BFHKCt31am8UuAIm8hh-ZI3YnjIteS9lNe4c2AJ2c6pDecNLjdG8OG6VeddSW29Lgehqdx4c3qKSTSbaL8fH0Hn-ez4spG4iHBgOXerY1R2kvaVaxjY6qN1OFZ9dWjiDIFAGo~MggxxNn8zSKwJHTtCqzKG9EYP-dozIjb-kmmlao0eolGHi1bh9tVUofuA__&Key-Pair-Id=K269JMAT9ZF4GZ",
  },
  {
    title: "Free QR Code Generator",
    shortTitle: "QR Codes",
    accordionTitle: "Free QR Code Generator",
    description:
      "QR codes and short links are like peas in a pod. Dub offers free QR codes for every short link you create.",
    icon: QrCode,
    slug: "qr-codes",
    thumbnail:
      "https://media.cleanshot.cloud/media/42580/FUSjMlxa2Xqne98F9KO5i960094hS5XinPIfgC9r.jpeg?Expires=1693806001&Signature=H5-txoTKREO1I7R-X05XDKQK2lS6EdMjnmb5MSTgfAsx-cJ4gXipCu99TZxJovoFGyBy2yLnVn3WrBhRtr~XkAhk0REtXrtLCpRe~dy0WJymLacZ-joGNIT203o5TptMueNAhWJIzdURsVJTl7VkU94BFHKCt31am8UuAIm8hh-ZI3YnjIteS9lNe4c2AJ2c6pDecNLjdG8OG6VeddSW29Lgehqdx4c3qKSTSbaL8fH0Hn-ez4spG4iHBgOXerY1R2kvaVaxjY6qN1OFZ9dWjiDIFAGo~MggxxNn8zSKwJHTtCqzKG9EYP-dozIjb-kmmlao0eolGHi1bh9tVUofuA__&Key-Pair-Id=K269JMAT9ZF4GZ",
  },
  {
    title: "Personalize Your Short links",
    shortTitle: "Personalization",
    accordionTitle: "Personalize Your Short links",
    description:
      "Customize your link's behavior with device targeting, geo targeting, link cloaking, and more.",
    icon: Link2,
    slug: "personalization",
    thumbnail:
      "https://media.cleanshot.cloud/media/42580/FUSjMlxa2Xqne98F9KO5i960094hS5XinPIfgC9r.jpeg?Expires=1693806001&Signature=H5-txoTKREO1I7R-X05XDKQK2lS6EdMjnmb5MSTgfAsx-cJ4gXipCu99TZxJovoFGyBy2yLnVn3WrBhRtr~XkAhk0REtXrtLCpRe~dy0WJymLacZ-joGNIT203o5TptMueNAhWJIzdURsVJTl7VkU94BFHKCt31am8UuAIm8hh-ZI3YnjIteS9lNe4c2AJ2c6pDecNLjdG8OG6VeddSW29Lgehqdx4c3qKSTSbaL8fH0Hn-ez4spG4iHBgOXerY1R2kvaVaxjY6qN1OFZ9dWjiDIFAGo~MggxxNn8zSKwJHTtCqzKG9EYP-dozIjb-kmmlao0eolGHi1bh9tVUofuA__&Key-Pair-Id=K269JMAT9ZF4GZ",
  },
  // { title: "Programmatic Link Creation", shortTitle: "API", slug: "api" },
  {
    title: "Collaborate With Your Team",
    shortTitle: "Team collaboration",
    accordionTitle: "Collaborate With Your Team",
    description:
      "Invite your teammates to collaborate on your links. For enterprises, Dub offers SAML SSO for better security.",
    icon: Users,
    slug: "collaboration",
    thumbnail:
      "https://media.cleanshot.cloud/media/42580/FUSjMlxa2Xqne98F9KO5i960094hS5XinPIfgC9r.jpeg?Expires=1693806001&Signature=H5-txoTKREO1I7R-X05XDKQK2lS6EdMjnmb5MSTgfAsx-cJ4gXipCu99TZxJovoFGyBy2yLnVn3WrBhRtr~XkAhk0REtXrtLCpRe~dy0WJymLacZ-joGNIT203o5TptMueNAhWJIzdURsVJTl7VkU94BFHKCt31am8UuAIm8hh-ZI3YnjIteS9lNe4c2AJ2c6pDecNLjdG8OG6VeddSW29Lgehqdx4c3qKSTSbaL8fH0Hn-ez4spG4iHBgOXerY1R2kvaVaxjY6qN1OFZ9dWjiDIFAGo~MggxxNn8zSKwJHTtCqzKG9EYP-dozIjb-kmmlao0eolGHi1bh9tVUofuA__&Key-Pair-Id=K269JMAT9ZF4GZ",
  },
];
