import {
  ICustomerBody,
  TPaymentPlan,
} from "core/integration/payment/mock-config.ts";

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
    paymentPlan: "ANNUAL",
    savings: "50% SAVE",
    originalPrice: 39.99,
    duration: 12,
  },
  {
    id: "semester",
    name: "6 months",
    price: 29.99,
    currency: "USD",
    interval: "month",
    description: "Billed every semester",
    paymentPlan: "SEMESTER",
    savings: "25% SAVE",
    originalPrice: 39.99,
    duration: 6,
  },
  {
    id: "quarterly",
    name: "3 months",
    price: 39.99,
    currency: "USD",
    interval: "month",
    description: "Billed quarterly",
    paymentPlan: "QUARTERLY",
    duration: 3,
  },
];

// Mock user data
export const MOCK_USER: ICustomerBody = {
  id: "7553ae74-e2a5-47fd-818c-91fe314a65e2",
  email: "user@example.com",
  paymentInfo: {
    clientToken:
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiIsImtpZCI6ImNsaWVudC10b2tlbi1zaWduaW5nLWtleSJ9.eyJleHAiOjE3NDkwMzk2MTMsImFjY2Vzc1Rva2VuIjoiNDU3YTc0ODItYmY5Zi00Mjg3LWIyNTUtODQ3ZTk3N2I5MTVjIiwiYW5hbHl0aWNzVXJsIjoiaHR0cHM6Ly9hbmFseXRpY3MuYXBpLnNhbmRib3guY29yZS5wcmltZXIuaW8vbWl4cGFuZWwiLCJhbmFseXRpY3NVcmxWMiI6Imh0dHBzOi8vYW5hbHl0aWNzLnNhbmRib3guZGF0YS5wcmltZXIuaW8vY2hlY2tvdXQvdHJhY2siLCJpbnRlbnQiOiJDSEVDS09VVCIsImNvbmZpZ3VyYXRpb25VcmwiOiJodHRwczovL2FwaS5zYW5kYm94LnByaW1lci5pby9jbGllbnQtc2RrL2NvbmZpZ3VyYXRpb24iLCJjb3JlVXJsIjoiaHR0cHM6Ly9hcGkuc2FuZGJveC5wcmltZXIuaW8iLCJwY2lVcmwiOiJodHRwczovL3Nkay5hcGkuc2FuZGJveC5wcmltZXIuaW8iLCJlbnYiOiJTQU5EQk9YIiwicGF5bWVudEZsb3ciOiJERUZBVUxUIn0.99gyJwtsRjUZn59y2xTArDKWtNlCEOkb_RZIY_oTJoI",
  },
  currency: {
    currencyCard: "USD",
    currencyPaypal: "USD",
    currencyWallet: "USD",
    countryCode: "US",
  },
};
