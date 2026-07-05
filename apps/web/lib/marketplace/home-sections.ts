import { Category } from "@prisma/client";

export const MARKETPLACE_HOME_ROW_PAGE_SIZE = 5;

export const MARKETPLACE_HOME_CATEGORIES = [
  Category.AI,
  Category.Health,
  Category.Marketing,
  Category.Finance,
  Category.Development,
  Category.Support,
  Category.Design,
  Category.Ecommerce,
  Category.Consumer,
  Category.Education,
] as const;
