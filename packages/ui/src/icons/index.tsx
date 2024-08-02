"use client";

import { LucideIcon } from "lucide-react";
import { ComponentType, SVGProps } from "react";

// custom icons
export { default as Copy } from "./copy";
export { default as ExpandingArrow } from "./expanding-arrow";
export { default as Magic } from "./magic";
export { default as Photo } from "./photo";
export { default as SortOrder } from "./sort-order";
export { default as Success } from "./success";
export { default as Tick } from "./tick";

// loaders
export * from "./loading-circle";
export * from "./loading-dots";
export * from "./loading-spinner";

// brand logos
export * from "./facebook";
export * from "./github";
export * from "./go";
export * from "./google";
export * from "./linkedin";
export * from "./prisma";
export * from "./product-hunt";
export * from "./python";
export * from "./raycast";
export * from "./ruby";
export * from "./tinybird";
export * from "./twitter";
export * from "./typescript";
export * from "./unsplash";
export * from "./youtube";

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

export type Icon = LucideIcon | ComponentType<SVGProps<SVGSVGElement>>;
