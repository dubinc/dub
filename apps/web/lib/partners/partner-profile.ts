import {
  IndustryInterest,
  MonthlyTraffic,
  PreferredEarningStructure,
  SalesChannel,
} from "@dub/prisma/client";
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

export const monthlyTrafficAmounts: { id: MonthlyTraffic; label: string }[] = [
  {
    id: MonthlyTraffic.ZeroToOneThousand,
    label: "0 - 1,000",
  },
  {
    id: MonthlyTraffic.OneThousandToTenThousand,
    label: "1,000 - 10,000",
  },
  {
    id: MonthlyTraffic.TenThousandToFiftyThousand,
    label: "10,000 - 50,000",
  },
  {
    id: MonthlyTraffic.FiftyThousandToOneHundredThousand,
    label: "50,000 - 100,000",
  },
  {
    id: MonthlyTraffic.OneHundredThousandPlus,
    label: "100,000+",
  },
];

export const preferredEarningStructures: {
  id: PreferredEarningStructure;
  label: string;
}[] = [
  {
    id: PreferredEarningStructure.Revenue_Share,
    label: "Rev-share (% of sale)",
  },
  {
    id: PreferredEarningStructure.Per_Lead,
    label: "Per lead (CPL)",
  },
  {
    id: PreferredEarningStructure.Per_Sale,
    label: "Per sale (CPS)",
  },
  {
    id: PreferredEarningStructure.Per_Click,
    label: "Per click (CPC)",
  },
  {
    id: PreferredEarningStructure.One_Time_Payment,
    label: "One-time payment",
  },
];

export const salesChannels: { id: SalesChannel; label: string }[] = [
  {
    id: SalesChannel.Blogs,
    label: "Blogs",
  },
  {
    id: SalesChannel.Coupons,
    label: "Coupons",
  },
  {
    id: SalesChannel.Direct_Reselling,
    label: "Direct reselling",
  },
  {
    id: SalesChannel.Newsletters,
    label: "Newsletters",
  },
  {
    id: SalesChannel.Social_Media,
    label: "Social media",
  },
  {
    id: SalesChannel.Events,
    label: "Events",
  },
  {
    id: SalesChannel.Company_Referrals,
    label: "Company referrals",
  },
];
