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
  Php,
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
    title: "Advanced Analytics",
    description: "Powerful Analytics For The Modern Marketer",
    icon: ChartLine,
    href: "/help/article/dub-analytics",
  },
  {
    title: "Branded Links",
    description: "Branded Links That Stand Out",
    icon: Hyperlink,
    href: "/features/branded-links",
  },
  {
    title: "QR Codes",
    description: "Gorgeous QR codes for your links",
    icon: QRCode,
    href: "/features/qr-codes",
  },
  {
    title: "Personalization",
    description: "Personalize Your Short Links",
    icon: Paintbrush,
    href: "/features/personalization",
  },
  {
    title: "Collaboration",
    description: "Collaborate With Your Team",
    icon: Users,
    href: "/features/collaboration",
  },
  {
    title: "API",
    description: "Programmatic Link Creation",
    icon: WindowSettings,
    href: "/docs/api-reference/introduction",
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
    title: "Typescript",
    href: "/solutions/typescript",
  },
  {
    icon: Python,
    iconClassName:
      "py-0.5 [&_.snake]:transition-colors group-hover:[&_.snake1]:text-[#3776ab] group-hover:[&_.snake2]:text-[#ffd343]",
    title: "Python",
    href: "/solutions/python",
  },
  {
    icon: Go,
    iconClassName: "group-hover:text-[#00ACD7]",
    title: "Go",
    href: "/solutions/go",
  },
  {
    icon: Ruby,
    iconClassName:
      "py-[3px] grayscale brightness-150 transition-[filter] group-hover:grayscale-0 group-hover:brightness-100",
    title: "Ruby",
    href: "/solutions/ruby",
  },
  {
    icon: Php,
    iconClassName:
      "py-[3px] grayscale brightness-150 transition-[filter] group-hover:grayscale-0 group-hover:brightness-100",
    title: "PHP",
    href: "/solutions/php",
  },
];

export const RESOURCES = [
  {
    icon: Headset,
    title: "Help Center",
    href: "/help",
  },
  {
    icon: Book2,
    title: "Docs",
    href: "/docs",
  },
  {
    icon: Blog,
    title: "Blog",
    href: "/blog",
  },
  {
    icon: BulletList,
    title: "Changelog",
    href: "/changelog",
  },
  {
    icon: Stars2,
    title: "Customers",
    href: "/customers",
  },
  {
    icon: HexadecagonStar,
    title: "Brand",
    href: "/brand",
  },
];
