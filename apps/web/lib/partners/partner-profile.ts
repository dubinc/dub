import { IndustryInterest } from "@dub/prisma/client";
import {
  BookOpen,
  BracketsCurly,
  BriefcaseFill,
  Brush,
  ChartArea2,
  ChartLine,
  CreditCard,
  FileContent,
  Flask,
  GamingConsole,
  Gift,
  Heart,
  Icon,
  LifeRing,
  MarketingTarget,
  MobilePhone,
  MoneyBill,
  Msgs,
  PaperPlane,
  ShieldKeyhole,
  Sparkle3,
  Trophy,
  TV,
  UsersSettings,
} from "@dub/ui";

export const industryInterests: {
  id: IndustryInterest;
  icon: Icon;
  label: string;
}[] = [
  {
    id: IndustryInterest.AI,
    label: "AI",
    icon: Sparkle3,
  },
  {
    id: IndustryInterest.SaaS,
    label: "SaaS",
    icon: Sparkle3,
  },
  {
    id: IndustryInterest.Sales,
    label: "Sales",
    icon: ChartArea2,
  },
  {
    id: IndustryInterest.DevTool,
    label: "Dev Tools",
    icon: BracketsCurly,
  },
  {
    id: IndustryInterest.Marketing,
    label: "Marketing",
    icon: MarketingTarget,
  },
  {
    id: IndustryInterest.Ecommerce,
    label: "Ecommerce",
    icon: CreditCard,
  },
  {
    id: IndustryInterest.Creative_And_Design,
    label: "Creative & Design",
    icon: Brush,
  },
  {
    id: IndustryInterest.Productivity_Software,
    label: "Productivity Software",
    icon: BriefcaseFill,
  },
  {
    id: IndustryInterest.Gaming,
    label: "Gaming",
    icon: GamingConsole,
  },
  {
    id: IndustryInterest.Finance,
    label: "Finance",
    icon: MoneyBill,
  },
  {
    id: IndustryInterest.Customer_Service_And_Support,
    label: "Customer Service & Support",
    icon: LifeRing,
  },
  {
    id: IndustryInterest.Content_Management,
    label: "Content Management",
    icon: FileContent,
  },
  {
    id: IndustryInterest.Analytics_And_Data,
    label: "Analytics & Data",
    icon: ChartLine,
  },
  {
    id: IndustryInterest.Security,
    label: "Security",
    icon: ShieldKeyhole,
  },
  {
    id: IndustryInterest.Social_Media,
    label: "Social Media",
    icon: Msgs,
  },
  {
    id: IndustryInterest.Education_And_Learning,
    label: "Education & Learning",
    icon: BookOpen,
  },
  {
    id: IndustryInterest.Entertainment_And_Media,
    label: "Entertainment & Media",
    icon: TV,
  },
  {
    id: IndustryInterest.Consumer_Tech,
    label: "Consumer Tech",
    icon: MobilePhone,
  },
  {
    id: IndustryInterest.Sports,
    label: "Sports",
    icon: Trophy,
  },
  {
    id: IndustryInterest.Health_And_Fitness,
    label: "Health & Fitness",
    icon: Heart,
  },
  {
    id: IndustryInterest.Food_And_Beverage,
    label: "Food & Beverage",
    icon: Gift,
  },
  {
    id: IndustryInterest.Travel_And_Lifestyle,
    label: "Travel & Lifestyle",
    icon: PaperPlane,
  },
  {
    id: IndustryInterest.Human_Resources,
    label: "Human Resources",
    icon: UsersSettings,
  },
  {
    id: IndustryInterest.Science_And_Engineering,
    label: "Science & Engineering",
    icon: Flask,
  },
];
