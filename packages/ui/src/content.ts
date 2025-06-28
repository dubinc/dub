import { ElementType } from "react";
import {
  Book2Fill,
  BriefcaseFill,
  BulletListFill,
  DiamondTurnRightFill,
  DubAnalyticsIcon,
  DubLinksIcon,
  DubPartnersIcon,
  EnvelopeFill,
  FeatherFill,
  Github,
  Go,
  LifeRing,
  LinkedIn,
  MicrophoneFill,
  Php,
  ProductHunt,
  Python,
  Raycast,
  Ruby,
  Toggle2Fill,
  Twitter,
  Typescript,
  UsersFill,
  YouTube,
} from "./icons";
import { DubApiIcon } from "./icons/dub-api";
import { Elxo } from "./icons/elxo";
import { Logo } from "./logo";

export type NavItemChild = {
  title: string;
  description?: string;
  href: string;
  icon: ElementType;
  iconClassName?: string;
};

export type NavItemChildren = (
  | NavItemChild
  | { label: string; items: NavItemChild[] }
)[];

export const FEATURES_LIST = [
  {
    title: "Dub Links",
    description: "Short links with superpowers",
    icon: DubLinksIcon,
    href: "/home",
  },
  {
    title: "Dub Partners",
    description: "Grow your revenue with partnerships",
    icon: DubPartnersIcon,
    href: "/partners",
  },
  {
    title: "Dub Analytics",
    description: "Powerful real-time analytics",
    icon: DubAnalyticsIcon,
    href: "/analytics",
  },
  {
    title: "Dub API",
    description: "Programmatic link creation at scale",
    icon: DubApiIcon,
    href: "/docs/api-reference/introduction",
  },
  {
    title: "Dub Integrations",
    description: "Connect Dub with your favorite tools",
    icon: Toggle2Fill,
    href: "/integrations",
  },
];

export const CUSTOMER_STORIES = [
  {
    icon: Raycast,
    iconClassName: "group-hover:text-[#FF6363]",
    title: "Raycast",
    description: "Programmatic link sharing",
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
    href: "/sdks/typescript",
  },
  {
    icon: Python,
    iconClassName:
      "py-0.5 [&_.snake]:transition-colors group-hover:[&_.snake1]:text-[#3776ab] group-hover:[&_.snake2]:text-[#ffd343]",
    title: "Python",
    href: "/sdks/python",
  },
  {
    icon: Go,
    iconClassName: "group-hover:text-[#00ACD7]",
    title: "Go",
    href: "/sdks/go",
  },
  {
    icon: Ruby,
    iconClassName:
      "py-[3px] grayscale brightness-150 transition-[filter] group-hover:grayscale-0 group-hover:brightness-100",
    title: "Ruby",
    href: "/sdks/ruby",
  },
  {
    icon: Php,
    iconClassName:
      "py-[3px] grayscale brightness-150 transition-[filter] group-hover:grayscale-0 group-hover:brightness-100",
    title: "PHP",
    href: "/sdks/php",
  },
];

export const SOLUTIONS: NavItemChildren = [
  {
    icon: DiamondTurnRightFill,
    title: "Marketing Attribution",
    description: "Easily track and measure marketing impact",
    href: "/analytics",
  },
  {
    icon: MicrophoneFill,
    title: "Content Creators",
    description: "Intelligent audience insights and link tracking",
    href: "/solutions/creators",
  },
  {
    icon: UsersFill,
    title: "Affiliate Management",
    description: "Manage affiliates and automate payouts",
    href: "/partners",
  },
  {
    label: "SDKs",
    items: SDKS,
  },
];

export const RESOURCES = [
  {
    icon: LifeRing,
    title: "Help Center",
    description: "Answers to your questions",
    href: "/help",
  },
  {
    icon: Book2Fill,
    title: "Docs",
    description: "Platform documentation",
    href: "/docs/introduction",
  },
  {
    icon: UsersFill,
    title: "About",
    description: "Company, values, and team",
    href: "/about",
  },
  {
    icon: BriefcaseFill,
    title: "Careers",
    description: "Join our global, remote team",
    href: "/careers",
  },
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
    icon: Logo,
    title: "Brand Guidelines",
    description: "Logos, wordmark, etc.",
    href: "/brand",
  },
  {
    icon: EnvelopeFill,
    title: "Contact",
    description: "Reach out to support or sales",
    href: "/contact",
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
  { name: "DPA", slug: "dpa" },
  { name: "Subprocessors", slug: "subprocessors" },
  { name: "Report Abuse", slug: "abuse" },
];

export const SOCIAL_LINKS = [
  { name: "X (Twitter)", icon: Twitter, href: "https://x.com/dubdotco" },
  {
    name: "LinkedIn",
    icon: LinkedIn,
    href: "https://www.linkedin.com/company/dubinc",
  },
  {
    name: "GitHub",
    icon: Github,
    href: "https://github.com/dubinc/dub",
  },
  {
    name: "YouTube",
    icon: YouTube,
    href: "https://www.youtube.com/@dubdotco",
  },
];
