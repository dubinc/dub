import { Category } from "@dub/prisma/client";
import {
  BookOpen,
  Brush,
  CircleHalfDottedClock,
  Code,
  CreditCard,
  Heart,
  Icon,
  MarketingTarget,
  MoneyBill,
  ShieldKeyhole,
  Sparkle3,
  User,
} from "@dub/ui/icons";

export const categories: {
  id: Category;
  icon: Icon;
  label: string;
}[] = [
  {
    id: Category.Artificial_Intelligence,
    label: "AI",
    icon: Sparkle3,
  },
  {
    id: Category.Development,
    label: "Development",
    icon: Code,
  },
  {
    id: Category.Design,
    label: "Design",
    icon: Brush,
  },
  {
    id: Category.Productivity,
    label: "Productivity",
    icon: CircleHalfDottedClock,
  },
  {
    id: Category.Finance,
    label: "Finance",
    icon: MoneyBill,
  },
  {
    id: Category.Marketing,
    label: "Marketing",
    icon: MarketingTarget,
  },
  {
    id: Category.Ecommerce,
    label: "Ecommerce",
    icon: CreditCard,
  },
  {
    id: Category.Security,
    label: "Security",
    icon: ShieldKeyhole,
  },
  {
    id: Category.Education,
    label: "Education",
    icon: BookOpen,
  },
  {
    id: Category.Health,
    label: "Health",
    icon: Heart,
  },
  {
    id: Category.Consumer,
    label: "Consumer",
    icon: User,
  },
];

export const categoriesMap: Partial<
  Record<Category, { icon: Icon; label: string }>
> = Object.fromEntries(categories.map((category) => [category.id, category]));
