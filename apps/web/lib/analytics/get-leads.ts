import { AnalyticsFilters, getAnalytics } from "./get-analytics";

export const getLeads = (filters: AnalyticsFilters) => {
  return getAnalytics("leads", filters);
};
