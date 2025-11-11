"use client";

import { LucideIcon } from "lucide-react";
import { ComponentType, SVGProps } from "react";

// custom icons
export * from "./arrow-up-right-2";
export * from "./copy";
export * from "./crown-small";
export * from "./dub-analytics";
export * from "./dub-api";
export * from "./dub-crafted-shield";
export * from "./dub-links";
export * from "./dub-partners";
export * from "./dub-product-icon";
export * from "./expanding-arrow";
export * from "./ios-app-store";
export * from "./lock-small";
export * from "./magic";
export * from "./markdown-icon";
export * from "./matrix-lines";
export * from "./photo";
export * from "./sort-order";
export * from "./success";
export * from "./tick";

// loaders
export * from "./loading-circle";
export * from "./loading-dots";
export * from "./loading-spinner";

// brand logos
export * from "./anthropic";
export * from "./facebook";
export * from "./github";
export * from "./google";
export * from "./instagram";
export * from "./linkedin";
export * from "./openai";
export * from "./product-hunt";
export * from "./slack";
export * from "./tiktok";
export * from "./twitter";
export * from "./unsplash";
export * from "./youtube";

// Payment platforms
export * from "./payment-platforms/card-amex";
export * from "./payment-platforms/card-discover";
export * from "./payment-platforms/card-mastercard";
export * from "./payment-platforms/card-visa";
export * from "./payment-platforms/paypal";
export * from "./payment-platforms/stripe-link";

// SDKs
export * from "./go";
export * from "./php";
export * from "./python";
export * from "./ruby";
export * from "./typescript";

// continent icons
export * from "./continents";

// dub default domains logos
export * from "./default-domains/amazon";
export * from "./default-domains/chatgpt";
export * from "./default-domains/figma";
export * from "./default-domains/github-enhanced";
export * from "./default-domains/google-enhanced";
export * from "./default-domains/spotify";

// Nucleo icons
export * from "./nucleo";

// Feature icons for pricing table
export * from "./plan-feature-icons";

export type Icon = LucideIcon | ComponentType<SVGProps<SVGSVGElement>>;
