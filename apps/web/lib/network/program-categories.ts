import {
  BookOpen,
  Brush,
  CircleHalfDottedClock,
  Code,
  CreditCard,
  Headset,
  Heart,
  Icon,
  MarketingTarget,
  MoneyBill,
  ShieldKeyhole,
  Sparkle3,
  User,
} from "@dub/ui/icons";
import { Category } from "@prisma/client";

export const PROGRAM_CATEGORIES: {
  id: Category;
  icon: Icon;
  label: string;
  listPageDescription: string;
}[] = [
  {
    id: Category.AI,
    label: "AI",
    icon: Sparkle3,
    listPageDescription:
      "Browse the best affiliate programs for AI tools, agents, and chatbots.",
  },
  {
    id: Category.Development,
    label: "DevTools",
    icon: Code,
    listPageDescription:
      "Browse the best affiliate programs for developer tools, APIs, and no-code platforms.",
  },
  {
    id: Category.Design,
    label: "Design",
    icon: Brush,
    listPageDescription:
      "Browse the best affiliate programs for graphic design tools and creative software.",
  },
  {
    id: Category.Productivity,
    label: "Productivity",
    icon: CircleHalfDottedClock,
    listPageDescription:
      "Browse the best affiliate programs for productivity apps, email tools, and collaboration software.",
  },
  {
    id: Category.Finance,
    label: "FinTech",
    icon: MoneyBill,
    listPageDescription:
      "Browse the best affiliate programs for trading, crypto, and finance apps.",
  },
  {
    id: Category.Marketing,
    label: "Marketing",
    icon: MarketingTarget,
    listPageDescription:
      "Browse the best affiliate programs for marketing software, email marketing, and SEO tools.",
  },
  {
    id: Category.Ecommerce,
    label: "Ecommerce",
    icon: CreditCard,
    listPageDescription:
      "Browse the best affiliate programs for online stores, newsletters, and ecommerce platforms.",
  },
  {
    id: Category.Security,
    label: "Security",
    icon: ShieldKeyhole,
    listPageDescription:
      "Browse the best affiliate programs for cybersecurity software and privacy tools.",
  },
  {
    id: Category.Education,
    label: "Education",
    icon: BookOpen,
    listPageDescription:
      "Browse the best affiliate programs for edtech, learning tools, and education software.",
  },
  {
    id: Category.Health,
    label: "Healthcare",
    icon: Heart,
    listPageDescription:
      "Browse the best affiliate programs for healthtech, wellness apps, and health software.",
  },
  {
    id: Category.Consumer,
    label: "Consumer",
    icon: User,
    listPageDescription:
      "Browse the best affiliate programs for consumer apps and lifestyle software.",
  },
  {
    id: Category.Support,
    label: "Support",
    icon: Headset,
    listPageDescription:
      "Browse the best affiliate programs for customer support software and agentic tools.",
  },
];

export const PROGRAM_CATEGORIES_MAP: Partial<
  Record<Category, { icon: Icon; label: string; listPageDescription: string }>
> = Object.fromEntries(
  PROGRAM_CATEGORIES.map((category) => [category.id, category]),
);
