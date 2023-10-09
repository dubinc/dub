import { Button } from "@dub/ui";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { useDebouncedCallback } from "use-debounce";

export default function Feedback() {
  let session;
  try {
    const { data } = useSession();
    session = data;
  } catch (e) {
    session = null;
  }
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
        toast.success("Successfully submitted feedback!");
      });
  };

  const handleKeyDown = async (e) => {
    if (e.key === "Enter" && e.metaKey) {
      await handleSubmit(e);
    }
  };

  // Pre-warm the API endpoint to avoid cold start
  // Ideally we'd use an edge function for this but
  // node-mailer is not edge compatible
  const prewarm = useDebouncedCallback(
    () => {
      fetch("/api/site/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "prewarm",
          feedback: null,
        }),
      });
    },
    30000,
    { leading: true },
  );

  return (
    <div className="scrollbar-hide relative z-0 h-[400px] overflow-scroll border border-gray-200 bg-white px-7 py-5 sm:rounded-lg sm:border-gray-100 sm:shadow-lg">
      <div className="mb-5 flex">
        <h1 className="text-xl font-semibold">Feedback</h1>
      </div>
      <AnimatePresence>
        {state === "submitted" ? (
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
            className="grid gap-5"
            onSubmit={handleSubmit}
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
                onFocus={prewarm}
                onChange={(e) => setData({ ...data, email: e.target.value })}
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
                onKeyDown={handleKeyDown}
                className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
                placeholder="What other data would you like to see?"
                value={data.feedback}
                onFocus={prewarm}
                onChange={(e) => setData({ ...data, feedback: e.target.value })}
                aria-invalid="true"
              />
            </div>
            <Button text="Submit feedback" loading={state === "submitting"} />
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
