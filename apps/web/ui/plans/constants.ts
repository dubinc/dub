import { TPaymentPlan } from "../../core/integration/payment/config";

export const PLAN_FEATURES = [
  "Unlimited dynamic QR codes",
  "All QR types supported (Web, PDF, Image, WhatsApp & more)",
  "Edit & manage your QR codes anytime",
  "Track unlimited scans",
  "Access detailed QR analytics",
];

export interface IPricingPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: "month" | "year";
  description: string;
  paymentPlan: TPaymentPlan;
  prevPlan?: TPaymentPlan;
  savings?: string;
  originalPrice?: number;
  duration: number; // duration in months
}

export const PRICING_PLANS: IPricingPlan[] = [
  {
    id: "annual",
    name: "12 months",
    price: 19.99,
    currency: "USD",
    interval: "month",
    description: "Billed annually",
    paymentPlan: "PRICE_YEAR_PLAN",
    prevPlan: "PRICE_YEAR_PLAN_PREV",
    savings: "50% SAVE",
    originalPrice: 39.99,
    duration: 12,
  },
  {
    id: "semester",
    name: "3 months",
    price: 29.99,
    currency: "USD",
    interval: "month",
    description: "Billed every quarter",
    paymentPlan: "PRICE_QUARTER_PLAN",
    prevPlan: "PRICE_QUARTER_PLAN_PREV",
    savings: "25% SAVE",
    originalPrice: 39.99,
    duration: 3,
  },
  {
    id: "quarterly",
    name: "month",
    price: 39.99,
    currency: "USD",
    interval: "month",
    description: "Billed monthly",
    paymentPlan: "PRICE_MONTH_PLAN",
    duration: 1,
  },
];
