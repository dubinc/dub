import { PlanProps } from "@/lib/types";

// Get API rate limit for a given plan in requests per minute
export const getAPIRateLimitForPlan = (plan: PlanProps) => {
  switch (plan) {
    case "free":
      return 600;
    case "pro":
      return 3000;
    case "business":
    case "business plus":
    case "business extra":
    case "business max":
      return 6000;
    // case "enterprise":
    //   return ;
  }

  return 600;
};
