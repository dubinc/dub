"use client"

import { FC, useEffect, useState } from "react"
import { X } from "lucide-react"
import { Button } from "@dub/ui"
import { TextArea } from "@radix-ui/themes"

interface INpsFeedback {
  rating: number;
  handleFeedbackAnswer: (arg1?: string) => void;
  closeFeedback: () => void;
  fireOpenEvent: (element_no: number) => void;
}

export const NpsFeedback: FC<INpsFeedback> = ({ rating, handleFeedbackAnswer, closeFeedback, fireOpenEvent }) => {
  const [feedback, setFeedback] = useState("")

  const getFeedbackText = (rating: number) => {
    if (rating <= 6) return "Sorry to hear that! What could we improve to make GetQR better?"
    if (rating <= 8) return "Thanks! What would make you more likely to recommend us?"
    return "Amazing! What do you like most about GetQR?"
  }

  const onFeedbackSubmit = () => {
    if(!feedback) return

    handleFeedbackAnswer(feedback)
  }

  useEffect(() => {
    fireOpenEvent(2)
  }, [])
 
  return (
    <div className="fixed bottom-3 md:bottom-8 right-0 w-full max-w-xl z-50">
      <div className="px-3 md:px-8" >
        <div className="relative bg-white border border-border-500 rounded-xl shadow-lg p-6 flex flex-col gap-4">
          <h2 className="text-sm font-bold text-neutral-800 pr-6">
            {getFeedbackText(rating)}
          </h2>
          <button
            className="absolute top-4 right-4 size-5"
            onClick={closeFeedback}
          >
            <X className="size-5 text-neutral-300" />
          </button>
          <TextArea
              placeholder="Please type your feedback here..."
              className="min-h-[200px] resize-none"
              onChange={(e) => setFeedback(e.target.value)}
              value={feedback}
          />  
          <div className="flex justify-end">
            <Button variant="primary" size="lg" text="Send feedback" className="w-fit" onClick={onFeedbackSubmit} />
          </div>
        </div>
      </div>
    </div>
  )
}
