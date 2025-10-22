"use client";

import useUser from "@/lib/swr/use-user.ts";
import { trackClientEvents } from "core/integration/analytic";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useFeedback } from "./hooks/use-nps-feedback";
import { NpsFeedback } from "./nps-feedback";
import { NpsRating } from "./nps-rating";

export function NpsForm() {
  const [rating, setRating] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [hasClosed, setHasClosed] = useState(false);
  const { user } = useUser();
  const { leaveFeedback } = useFeedback();
  const pathname = usePathname();
  const profilePaths = ["/account/settings", "/account/plans"];
  const pageName = profilePaths.includes(pathname) ? "profile" : "dashboard";

  const handleFeedbackAnswer = async (feedback?: string) => {
    trackClientEvents({
      event: EAnalyticEvents.USER_FEEDBACK,
      params: {
        page_name: pageName,
        flow_type: "nps",
        content_value: feedback,
        content_group: 2,
        event_category: "Authorized",
        email: user?.email,
        trigger: user?.nps.trigger,
      },
      sessionId: user?.id,
    });
    setHasClosed(true);
    toast.success("Your feedback was successfully submitted.");
  };

  const handleRatingClick = async (selectedRating: number) => {
    setRating(selectedRating);
    const success = await leaveFeedback();
    if (success) {
      trackClientEvents({
        event: EAnalyticEvents.USER_FEEDBACK,
        params: {
          page_name: pageName,
          flow_type: "nps",
          content_value: selectedRating.toString(),
          content_group: 1,
          event_category: "Authorized",
          email: user?.email,
          trigger: user?.nps.trigger,
        },
        sessionId: user?.id,
      });
      setShowFeedback(true);
    } else {
      setHasClosed(true);
      toast.error("Failed to leave a feedback");
    }
  };

  const fireOpenEvent = (element_no: number) => {
    trackClientEvents({
      event: EAnalyticEvents.ELEMENT_OPENED,
      params: {
        page_name: pageName,
        element_name: "nps",
        element_no,
        event_category: "Authorized",
        email: user?.email,
        trigger: user?.nps.trigger,
      },
      sessionId: user?.id,
    });
  };

  if (!user?.nps.show || hasClosed) return null;

  if (!rating)
    return (
      <NpsRating
        handleRatingClick={handleRatingClick}
        fireOpenEvent={fireOpenEvent}
      />
    );

  if (showFeedback)
    return (
      <NpsFeedback
        rating={rating}
        handleFeedbackAnswer={handleFeedbackAnswer}
        closeFeedback={() => setHasClosed(true)}
        fireOpenEvent={fireOpenEvent}
      />
    );

  return null;
}
