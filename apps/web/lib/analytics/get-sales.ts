import { AnalyticsFilters, getAnalytics } from "./get-analytics";

export const getSales = (filters: AnalyticsFilters) => {
  return getAnalytics("sales", filters);
};
