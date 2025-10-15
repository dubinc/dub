"use client";

import useUser from "@/lib/swr/use-user.ts";
import { trackClientEvents } from "core/integration/analytic";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface";
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

  const handleFeedbackAnswer = async (feedback?: string) => {
    trackClientEvents({
      event: EAnalyticEvents.NPS_FEEDBACK,
      params: {
        feedback,
      },
      sessionId: user?.id,
    });
    setHasClosed(true);
  };

  const handleRatingClick = async (selectedRating: number) => {
    setRating(selectedRating);
    const success = await leaveFeedback(selectedRating, user?.id);
    if (!success) {
      setHasClosed(true);
      toast.error("Failed to leave a feedback");
    }
    setShowFeedback(true);
  };

  if (!user?.showNPS || hasClosed) return null;

  if (!rating) return <NpsRating handleRatingClick={handleRatingClick} />;

  if (showFeedback)
    return (
      <NpsFeedback
        rating={rating}
        handleFeedbackAnswer={handleFeedbackAnswer}
        closeFeedback={() => setHasClosed(true)}
      />
    );

  return null;
}
