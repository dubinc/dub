import { ElementType } from "react";
import {
  Book2,
  Briefcase,
  BulletList,
  DiamondTurnRight,
  DubAnalyticsIcon,
  DubLinksIcon,
  DubPartnersIcon,
  Envelope,
  Feather,
  Github,
  Go,
  LifeRing,
  LinkedIn,
  Microphone,
  Php,
  Python,
  Ruby,
  Toggle2,
  Twitter,
  Typescript,
  Users,
  YouTube,
  withFillVariant,
} from "./icons";
import { DubApiIcon } from "./icons/dub-api";
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
    id: "links",
    title: "Dub Links",
    description: "Short links with superpowers",
    icon: DubLinksIcon,
    href: "/links",
  },
  {
    id: "partners",
    title: "Dub Partners",
    description: "Grow your revenue with partnerships",
    icon: DubPartnersIcon,
    href: "/partners",
  },
  {
    id: "analytics",
    title: "Dub Analytics",
    description: "Powerful real-time analytics",
    icon: DubAnalyticsIcon,
    href: "/analytics",
  },
  {
    id: "api",
    title: "Dub API",
    description: "Programmatic link creation at scale",
    icon: DubApiIcon,
    href: "/docs/api-reference/introduction",
  },
  {
    title: "Dub Integrations",
    description: "Connect Dub with your favorite tools",
    icon: withFillVariant(Toggle2),
    href: "/integrations",
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
    icon: withFillVariant(DiamondTurnRight),
    title: "Marketing Attribution",
    description: "Easily track and measure marketing impact",
    href: "/analytics",
  },
  {
    icon: withFillVariant(Microphone),
    title: "Content Creators",
    description: "Intelligent audience insights and link tracking",
    href: "/solutions/creators",
  },
  {
    icon: withFillVariant(Users),
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
    icon: Book2,
    title: "Docs",
    description: "Platform documentation",
    href: "/docs",
  },
  {
    icon: withFillVariant(Users),
    title: "About",
    description: "Company, values, and team",
    href: "/about",
  },
  {
    icon: Briefcase,
    title: "Careers",
    description: "Join our global, remote team",
    href: "/careers",
  },
  {
    icon: Feather,
    title: "Blog",
    description: "Insights and stories",
    href: "/blog",
  },
  {
    icon: BulletList,
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
    icon: Envelope,
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
  { name: "Affiliate Program Terms", slug: "affiliates" },
  { name: "DPA", slug: "dpa" },
  { name: "Partner Terms", slug: "partners" },
  { name: "Privacy Policy", slug: "privacy" },
  { name: "Report Abuse", slug: "abuse" },
  { name: "SLA", slug: "sla" },
  { name: "Subprocessors", slug: "subprocessors" },
  { name: "Terms of Service", slug: "terms" },
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
