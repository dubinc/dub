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
  slug: "company" | "education";
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
    thumbnail: "https://d2vwwcvoksz7ty.cloudfront.net/features/analytics.png",
    videoUrl:
      "https://www.youtube.com/embed/m062ApqcRow?si=8FRndy4ABWPTioHU&autoplay=1",
    bentoTitle: "Detailed insights for every click",
    bentoDescription:
      "Dub provides detailed analytics for every click on your links. See where your audience is coming from and what devices they are using.",
    bentoFeatures: [
      {
        title: "Time-series data",
        description:
          "See how your links are performing over time with a beautiful time-series chart.",
      },
      {
        title: "Geographic data",
        description:
          "Understand your audience with geographic data – on both a country and city level.",
      },
      {
        title: "Device data",
        description:
          "See what devices your audience is using to click on your links",
      },
      {
        title: "Referrer data",
        description:
          "Understand which websites are driving the most traffic to your links.",
      },
      {
        title: "404 monitoring",
        description:
          "Monitor your links for 404 errors and notifies you when they occur.",
      },
    ],
  },
  {
    title: "Branded Links that Stand Out",
    shortTitle: "Branded Links",
    accordionTitle: "Use your own domain",
    description:
      "Dub offers free and unlimited custom domains on all plans for you to create branded links that stand out.",
    icon: Airplay,
    slug: "branded-links",
    thumbnail: "https://d2vwwcvoksz7ty.cloudfront.net/features/analytics.png",
    videoUrl:
      "https://www.youtube.com/embed/m062ApqcRow?si=8FRndy4ABWPTioHU&autoplay=1",
    bentoTitle: "Impress your audience with branded links",
    bentoDescription:
      "Create custom short links that match your brand and stand out from the crowd, with free and unlimited custom domains on all plans.",
    bentoFeatures: [
      {
        title: "Unlimited custom domains",
        description:
          "Add as many custom domains as you want to your project at no extra cost.",
        href: "/help/article/how-to-add-custom-domain",
      },
      {
        title: "Free SSL certificates",
        description:
          "Dub automatically provisions and renews SSL certificates for your custom domains.",
      },
      {
        title: "Vanity URLs",
        description:
          "Create custom paths for your links to make them even more memorable.",
        href: "/help/article/how-to-create-link",
      },
      {
        title: "Link cloaking",
        description:
          "Hide your destination URL with link cloaking to make your links look cleaner.",
        href: "/help/article/how-to-create-link#link-cloaking",
      },
      {
        title: "Custom QR codes",
        description:
          "With Dub Pro, you can create branded QR codes for your links.",
        href: "/features/qr-codes",
      },
    ],
  },
  {
    title: "Free QR Code Generator",
    shortTitle: "QR Codes",
    accordionTitle: "Free QR Code Generator",
    description:
      "QR codes and short links are like peas in a pod. Dub offers free QR codes for every short link you create.",
    icon: QrCode,
    slug: "qr-codes",
    thumbnail: "https://d2vwwcvoksz7ty.cloudfront.net/features/analytics.png",
    videoUrl:
      "https://www.youtube.com/embed/m062ApqcRow?si=8FRndy4ABWPTioHU&autoplay=1",
    bentoTitle: "Gorgeous QR codes for your links",
    bentoDescription:
      "Create beautiful flyers and posters with QR codes for your links.",
  },
  {
    title: "Personalize Your Short links",
    shortTitle: "Personalization",
    accordionTitle: "Personalize Your Short links",
    description:
      "Customize your link's behavior with device targeting, geo targeting, link cloaking, and more.",
    icon: Link2,
    slug: "personalization",
    thumbnail: "https://d2vwwcvoksz7ty.cloudfront.net/features/analytics.png",
    videoUrl:
      "https://www.youtube.com/embed/m062ApqcRow?si=8FRndy4ABWPTioHU&autoplay=1",
    bentoTitle: "Optimize your links for every audience",
    bentoDescription:
      "Get the most out of every click by delivering the right experience to the right audience.",
    bentoFeatures: [
      {
        title: "Device targeting",
        description:
          "Redirect your audience to different destinations based on their device type (e.g. iOS/Android).",
        href: "/help/article/how-to-create-link#device-targeting-ios--android",
      },
      {
        title: "Geo targeting",
        description:
          "Redirect your audience to different destinations based on their country of origin.",
        href: "/help/article/how-to-create-link#geo-targeting",
      },
      {
        title: "Expiration dates",
        description:
          "Automatically disable your links after a certain date & time.",
        href: "/help/article/how-to-create-link#expiration-date",
      },
      {
        title: "Password protection",
        description:
          "Protect your links with passwords to prevent unauthorized access.",
        href: "/help/article/how-to-create-link#password-protection",
      },
      {
        title: "Link cloaking",
        description:
          "Hide your destination URL with link cloaking to make your links look cleaner.",
        href: "/help/article/how-to-create-link#link-cloaking",
      },
    ],
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
    thumbnail: "https://d2vwwcvoksz7ty.cloudfront.net/features/analytics.png",
    videoUrl:
      "https://www.youtube.com/embed/m062ApqcRow?si=8FRndy4ABWPTioHU&autoplay=1",
    bentoTitle: "Seamless collaboration for marketing teams",
    bentoDescription:
      "View and manage your team's links in one place, with fine-grained permissions and SAML SSO for enterprises.",
    bentoFeatures: [
      {
        title: "Unlimited teammates",
        description:
          "All paid plans come with unlimited teammates, so you can work with your team without worrying about extra costs.",
        href: "/help/article/how-to-invite-teammates",
      },
      {
        title: "SAML SSO",
        description:
          "Dub offers SAML SSO for enterprises to provide better security and control over their projects.",
        href: "/help/category/saml-sso",
      },
      {
        title: "Tags & comments",
        description:
          "Organize your links with tags and comments to provide context for your team.",
        href: "/help/article/how-to-use-tags",
      },
      {
        title: "Fine-grained permissions",
        description:
          "Enterprises on Dub can set role-based access controls (RBAC) to control who can create, edit, and delete links.",
      },
      {
        title: "Team analytics",
        description:
          "See how your team is performing with team analytics, including link clicks and top referrers.",
      },
    ],
  },
];
