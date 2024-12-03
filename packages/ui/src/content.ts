import {
  Book2Fill,
  BulletListFill,
  ConnectedDotsFill,
  CubeSettingsFill,
  FeatherFill,
  Go,
  HeadsetFill,
  Hyperlink,
  LinesY,
  Php,
  ProductHunt,
  Python,
  Raycast,
  Ruby,
  Typescript,
} from "./icons";
import { Elxo } from "./icons/elxo";

export const FEATURES_LIST = [
  {
    title: "Dub Links",
    description: "Short links with superpowers",
    icon: Hyperlink,
    href: "/home",
  },
  {
    title: "Dub Analytics",
    description: "Powerful real-time analytics",
    icon: LinesY,
    href: "/help/article/dub-analytics",
  },
  {
    title: "Dub API",
    description: "Programmatic link creation at scale",
    icon: CubeSettingsFill,
    href: "/docs/api-reference/introduction",
  },
  {
    title: "Dub Integrations",
    description: "Connect Dub with your favorite tools",
    icon: ConnectedDotsFill,
    href: "/docs/integrations",
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
    icon: FeatherFill,
    title: "Blog",
    description: "Insights and stories",
    href: "/blog",
  },
  {
    icon: BulletListFill,
    title: "Changelog",
    description: "Releases and updates",
    href: "/changelog",
  },
  {
    icon: Book2Fill,
    title: "Docs",
    description: "Platform documentation",
    href: "/docs",
  },
  {
    icon: HeadsetFill,
    title: "Help Center",
    description: "Answers to your questions",
    href: "/help",
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
