import { PlanProps } from "@/lib/types";

// Get rate limit for a given plan in requests per minute
export const getRateLimitForPlan = (plan: PlanProps) => {
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
