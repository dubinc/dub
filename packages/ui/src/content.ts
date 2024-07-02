import {
  Blog,
  Book2,
  BulletList,
  ChartLine,
  Code,
  Go,
  Headset,
  HexadecagonStar,
  Hyperlink,
  OfficeBuilding,
  Paintbrush,
  Prisma,
  Python,
  QRCode,
  Raycast,
  Ruby,
  Stars2,
  Tinybird,
  Typescript,
  Users,
  WindowSettings,
} from "./icons";

export const FEATURES_LIST = [
  {
    title: "Powerful Analytics For The Modern Marketer",
    shortTitle: "Advanced Analytics",
    icon: ChartLine,
    slug: "features/analytics",
  },
  {
    title: "Branded Links That Stand Out",
    shortTitle: "Branded Links",
    icon: Hyperlink,
    slug: "features/branded-links",
  },
  {
    title: "Gorgeous QR codes for your links",
    shortTitle: "QR Codes",
    icon: QRCode,
    slug: "features/qr-codes",
  },
  {
    title: "Personalize Your Short Links",
    shortTitle: "Personalization",
    icon: Paintbrush,
    slug: "features/personalization",
  },
  {
    title: "Collaborate With Your Team",
    shortTitle: "Team Collaboration",
    icon: Users,
    slug: "features/collaboration",
  },
  {
    title: "Programmatic Link Creation",
    shortTitle: "API",
    icon: WindowSettings,
    slug: "docs/api-reference/introduction",
  },
];

export const CUSTOMER_STORIES = [
  {
    icon: Raycast,
    iconClassName: "group-hover:text-[#FF6363]",
    title: "Raycast",
    description:
      "How Raycast added link-sharing features to Ray.so with Dub.co's link infrastructure",
    href: "/customers/raycast",
  },
  {
    icon: Tinybird,
    iconClassName: "group-hover:text-[#268472]",
    title: "Tinybird",
    description:
      "How Tinybird uses Dub.co to enhance their digital marketing strategies",
    href: "/customers/tinybird",
  },
  {
    icon: Prisma,
    iconClassName: "group-hover:text-[#4C51BF]",
    title: "Prisma",
    description: "How Prisma uses Dub.co to improve insights for pris.ly links",
    href: "/customers/prisma",
  },
];

export const PROFILES = [
  {
    icon: Code,
    title: "Developers",
    description: "API for efficient link management",
    href: "/docs/introduction",
  },
  {
    icon: OfficeBuilding,
    title: "Enterprise",
    description: "Scalable link management solutions",
    href: "/enterprise",
  },
];

export const SDKS = [
  {
    icon: Typescript,
    iconClassName: "py-0.5 group-hover:text-[#3178C6]",
    name: "Typescript",
    href: "/solutions/typescript",
  },
  {
    icon: Python,
    iconClassName:
      "py-0.5 [&_.snake]:transition-colors group-hover:[&_.snake1]:text-[#3776ab] group-hover:[&_.snake2]:text-[#ffd343]",
    name: "Python",
    href: "/solutions/python",
  },
  {
    icon: Go,
    iconClassName: "group-hover:text-[#00ACD7]",
    name: "Go",
    href: "/solutions/go",
  },
  {
    icon: Ruby,
    iconClassName:
      "py-[3px] grayscale brightness-150 transition-[filter] group-hover:grayscale-0 group-hover:brightness-100",
    name: "Ruby",
    href: "/solutions/ruby",
  },
];

export const RESOURCES = [
  {
    icon: Headset,
    name: "Help Center",
    href: "/help",
  },
  {
    icon: Book2,
    name: "Docs",
    href: "/docs",
  },
  {
    icon: Blog,
    name: "Blog",
    href: "/blog",
  },
  {
    icon: BulletList,
    name: "Changelog",
    href: "/changelog",
  },
  {
    icon: Stars2,
    name: "Customers",
    href: "/customers",
  },
  {
    icon: HexadecagonStar,
    name: "Brand",
    href: "/brand",
  },
];
