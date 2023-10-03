"use client";

import { useState } from "react";
import { experimental_useFormStatus as useFormStatus } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import Button from "#/ui/button";
import { submitFeedback } from "./action";
import { CheckCircle } from "lucide-react";

export default function Feedback() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="relative z-0 h-[400px] overflow-scroll border border-gray-200 bg-white px-7 py-5 scrollbar-hide sm:rounded-lg sm:border-gray-100 sm:shadow-lg">
      <div className="mb-5 flex">
        <h1 className="text-xl font-semibold">Feedback</h1>
      </div>
      <AnimatePresence>
        {submitted ? (
          <motion.div
            className="flex h-[280px] flex-col items-center justify-center space-y-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <CheckCircle className="h-8 w-8 text-green-500" />
            <p className="text-gray-500">Thank you for your feedback!</p>
          </motion.div>
        ) : (
          <motion.form
            action={(data) =>
              submitFeedback(data).then(() => {
                setSubmitted(true);
              })
            }
            className="grid gap-5"
            initial={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-xs font-medium text-gray-500"
              >
                EMAIL
              </label>
              <input
                name="email"
                type="email"
                placeholder="panic@thedis.co"
                autoComplete="email"
                className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="feedback"
                className="mb-2 block text-xs font-medium text-gray-500"
              >
                FEEDBACK
              </label>
              <textarea
                name="feedback"
                id="feedback"
                required={true}
                rows={6}
                className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
                placeholder="What other data would you like to see?"
                aria-invalid="true"
              />
            </div>
            <FormButton />
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

const FormButton = () => {
  const { pending } = useFormStatus();
  return <Button text="Submit feedback" loading={pending} />;
};
