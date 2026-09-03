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
      "Browse affiliate programs for AI tools and machine learning platforms.",
  },
  {
    id: Category.Development,
    label: "DevTools",
    icon: Code,
    listPageDescription:
      "Browse affiliate programs for developer tools and software infrastructure.",
  },
  {
    id: Category.Design,
    label: "Design",
    icon: Brush,
    listPageDescription:
      "Browse affiliate programs for design tools and creative software.",
  },
  {
    id: Category.Productivity,
    label: "Productivity",
    icon: CircleHalfDottedClock,
    listPageDescription:
      "Browse affiliate programs for productivity software and modern work tools.",
  },
  {
    id: Category.Finance,
    label: "FinTech",
    icon: MoneyBill,
    listPageDescription:
      "Browse affiliate programs for finance software and fintech platforms.",
  },
  {
    id: Category.Marketing,
    label: "Marketing",
    icon: MarketingTarget,
    listPageDescription:
      "Browse affiliate programs for marketing software and growth tools.",
  },
  {
    id: Category.Ecommerce,
    label: "Ecommerce",
    icon: CreditCard,
    listPageDescription:
      "Browse affiliate programs for ecommerce platforms and online retail tools.",
  },
  {
    id: Category.Security,
    label: "Security",
    icon: ShieldKeyhole,
    listPageDescription:
      "Browse affiliate programs for security software and privacy tools.",
  },
  {
    id: Category.Education,
    label: "Education",
    icon: BookOpen,
    listPageDescription:
      "Browse affiliate programs for education platforms and learning tools.",
  },
  {
    id: Category.Health,
    label: "Healthcare",
    icon: Heart,
    listPageDescription:
      "Browse affiliate programs for healthcare software and wellness tools.",
  },
  {
    id: Category.Consumer,
    label: "Consumer",
    icon: User,
    listPageDescription:
      "Browse affiliate programs for consumer apps and lifestyle products.",
  },
  {
    id: Category.Support,
    label: "Support",
    icon: Headset,
    listPageDescription:
      "Browse affiliate programs for customer support and help desk tools.",
  },
];

export const PROGRAM_CATEGORIES_MAP: Partial<
  Record<Category, { icon: Icon; label: string; listPageDescription: string }>
> = Object.fromEntries(
  PROGRAM_CATEGORIES.map((category) => [category.id, category]),
);
