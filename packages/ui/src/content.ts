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
  ProductHunt,
  Python,
  QRCode,
  Raycast,
  Ruby,
  Typescript,
  Users,
  WindowSettings,
} from "./icons";
import { Elxo } from "./icons/elxo";

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
    description: "Complex link infrastructure",
    href: "/customers/raycast",
  },
  {
    icon: ProductHunt,
    iconClassName: "group-hover:text-[#FF6154]",
    title: "Product Hunt",
    description: "Unlocking new growth",
    href: "/customers/product-hunt",
  },
  {
    icon: Elxo,
    iconClassName: "group-hover:text-[#353D7C]",
    title: "Elxo",
    description: "Overcoming API latency",
    href: "/customers/elxo",
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
    icon: Book2,
    title: "Docs",
    href: "/docs",
  },
  {
    icon: Headset,
    title: "Help Center",
    href: "/help",
  },
  {
    icon: HexadecagonStar,
    title: "Brand",
    href: "/brand",
  },
];

export const COMPARE_PAGES = [
  { name: "Bitly", slug: "bitly" },
  { name: "Rebrandly", slug: "rebrandly" },
  { name: "Short.io", slug: "short" },
  { name: "Bl.ink", slug: "blink" },
];

export const LEGAL_PAGES = [
  { name: "Privacy", slug: "privacy" },
  { name: "Terms", slug: "terms" },
  { name: "Trust Center", slug: "trust" },
  { name: "DPA", slug: "dpa" },
  { name: "Subprocessors", slug: "subprocessors" },
  { name: "Report Abuse", slug: "abuse" },
];
