import { trackClientEvents } from "core/integration/analytic";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface";

export const useFeedback = () => {
  const leaveFeedback = async (rating: number, sessionId?: string) => {
    try {
      await fetch("/api/guguesfd", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ hasRated: true }),
      });

      trackClientEvents({
        event: EAnalyticEvents.NPS_RATING,
        params: {
          rating,
        },
        sessionId,
      });
      return true;
    } catch (e) {
      return false;
    }
  };

  return {
    leaveFeedback,
  };
};
