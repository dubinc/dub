import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSession } from "next-auth/react";
import TextareaAutosize from "react-textarea-autosize";
import LoadingDots from "@/components/shared/icons/loading-dots";
import { CheckCircleFill } from "../shared/icons";

export default function Feedback() {
  const { data: session } = useSession();
  const [data, setData] = useState({
    email: session?.user?.email || "",
    feedback: "",
  });
  const [state, setState] = useState("idle");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setState("submitting");
    await fetch("/api/site/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .then(() => {
        setState("submitted");
      });
  };

  const handleKeyDown = async (e) => {
    if (e.key === "Enter" && e.metaKey) {
      await handleSubmit(e);
    }
  };

  return (
    <div className="relative bg-white px-7 py-5 sm:shadow-lg sm:rounded-lg border border-gray-200 sm:border-gray-100 h-[420px] overflow-scroll scrollbar-hide">
      <div className="mb-5 flex">
        <h1 className="text-xl font-semibold">Feedback</h1>
      </div>
      <AnimatePresence>
        {state === "submitted" ? (
          <motion.div
            className="h-[280px] flex flex-col justify-center items-center space-y-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <CheckCircleFill className="w-10 h-10 text-green-500" />
            <p className="text-gray-500">Thank you for your feedback!</p>
          </motion.div>
        ) : (
          <motion.form
            className="grid gap-5"
            onSubmit={handleSubmit}
            initial={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-gray-500 mb-2"
              >
                EMAIL
              </label>
              <input
                name="email"
                type="email"
                placeholder="panic@thedis.co"
                autoComplete="email"
                onChange={(e) => setData({ ...data, email: e.target.value })}
                className="border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:ring-gray-500 pr-10 block w-full rounded-md focus:outline-none sm:text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="feedback"
                className="block text-xs font-medium text-gray-500 mb-2"
              >
                FEEDBACK
              </label>
              <TextareaAutosize
                name="feedback"
                id="feedback"
                minRows={5}
                required={true}
                onKeyDown={handleKeyDown}
                className="border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:ring-gray-500 pr-10 block w-full rounded-md focus:outline-none sm:text-sm"
                placeholder="What other data would you like to see?"
                value={data.feedback}
                onChange={(e) => setData({ ...data, feedback: e.target.value })}
                aria-invalid="true"
              />
            </div>
            <button
              disabled={state === "submitting"}
              className={`${
                state === "submitting"
                  ? "cursor-not-allowed bg-gray-100 border-gray-200"
                  : "bg-black hover:bg-white text-white hover:text-black border-black"
              } flex justify-center items-center w-full text-sm h-10 rounded-md border transition-all focus:outline-none`}
            >
              {state === "submitting" ? (
                <LoadingDots color="#808080" />
              ) : (
                <p>Submit feedback</p>
              )}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
