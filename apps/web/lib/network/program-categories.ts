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
      "Browse partner programs for AI tools and machine learning platforms.",
  },
  {
    id: Category.Development,
    label: "Development",
    icon: Code,
    listPageDescription:
      "Browse partner programs for developer tools and software infrastructure.",
  },
  {
    id: Category.Design,
    label: "Design",
    icon: Brush,
    listPageDescription:
      "Browse partner programs for design tools and creative software.",
  },
  {
    id: Category.Productivity,
    label: "Productivity",
    icon: CircleHalfDottedClock,
    listPageDescription:
      "Browse partner programs for productivity software and modern work tools.",
  },
  {
    id: Category.Finance,
    label: "Finance",
    icon: MoneyBill,
    listPageDescription:
      "Browse partner programs for finance software and fintech platforms.",
  },
  {
    id: Category.Marketing,
    label: "Marketing",
    icon: MarketingTarget,
    listPageDescription:
      "Browse partner programs for marketing software and growth tools.",
  },
  {
    id: Category.Ecommerce,
    label: "Ecommerce",
    icon: CreditCard,
    listPageDescription:
      "Browse partner programs for ecommerce platforms and online retail tools.",
  },
  // {
  //   id: Category.Security,
  //   label: "Security",
  //   icon: ShieldKeyhole,
  //   listPageDescription:
  //     "Browse partner programs for security software and privacy tools.",
  // },
  {
    id: Category.Education,
    label: "Education",
    icon: BookOpen,
    listPageDescription:
      "Browse partner programs for education platforms and learning tools.",
  },
  {
    id: Category.Health,
    label: "Health",
    icon: Heart,
    listPageDescription:
      "Browse partner programs for health software and wellness tools.",
  },
  {
    id: Category.Consumer,
    label: "Consumer",
    icon: User,
    listPageDescription:
      "Browse partner programs for consumer apps and lifestyle products.",
  },
  {
    id: Category.Support,
    label: "Support",
    icon: Headset,
    listPageDescription:
      "Browse partner programs for customer support and help desk tools.",
  },
];

export const PROGRAM_CATEGORIES_MAP: Partial<
  Record<Category, { icon: Icon; label: string; listPageDescription: string }>
> = Object.fromEntries(
  PROGRAM_CATEGORIES.map((category) => [category.id, category]),
);
