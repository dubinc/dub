"use client";

import { CheckCircleFill } from "@/ui/shared/icons";
import { AnimatedSizeContainer, ClientOnly, Popover } from "@dub/ui";
import { cn } from "@dub/utils";
import { AnimatePresence, motion } from "framer-motion";
import Cookies from "js-cookie";
import { CircleHelp, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { createContext, useCallback, useState } from "react";
import { toast } from "sonner";
import SurveyForm from "./survey-form";

type UserSurveyStatus = "idle" | "loading" | "success";

export const UserSurveyContext = createContext<{ status: UserSurveyStatus }>({
  status: "idle",
});

const HIDDEN_COOKIE_ID = "hideUserSurveyPopup";

export default function UserSurveyButton() {
  const { data: session } = useSession();
  const [hidden, setHidden] = useState(Cookies.get(HIDDEN_COOKIE_ID) === "1");
  const [openPopover, setOpenPopover] = useState(false);

  const hide = useCallback(() => {
    setOpenPopover(false);
    setTimeout(() => {
      setHidden(true);
      Cookies.set(HIDDEN_COOKIE_ID, "1");
    }, 500);
  }, []);

  return (
    session?.user &&
    !session.user["source"] && (
      <ClientOnly>
        <AnimatePresence initial={false}>
          {!hidden && (
            <motion.div exit={{ opacity: 0 }} className="p-2">
              <Popover
                content={<UserSurveyPopupInner hide={hide} />}
                popoverContentClassName="mx-2"
                openPopover={!hidden && openPopover}
                setOpenPopover={setOpenPopover}
              >
                <button
                  className={cn(
                    "rounded-md p-1 text-left text-xs text-neutral-500 transition-colors duration-75",
                    "hover:text-neutral-600 data-[state=open]:text-neutral-600",
                    "outline-none focus-visible:ring-2 focus-visible:ring-black/50",
                  )}
                >
                  <CircleHelp className="mr-1 mt-0.5 size-3" />
                  Where did you hear about Dub?
                </button>
              </Popover>
            </motion.div>
          )}
        </AnimatePresence>
      </ClientOnly>
    )
  );
}

export function UserSurveyPopupInner({ hide }: { hide: () => void }) {
  const { update } = useSession();

  const [status, setStatus] = useState<UserSurveyStatus>("idle");

  return (
    <AnimatedSizeContainer height>
      <div className="p-4">
        <button
          className="absolute right-2.5 top-2.5 rounded-full p-1 transition-colors hover:bg-gray-100 active:scale-90"
          onClick={hide}
        >
          <X className="h-4 w-4 text-gray-500" />
        </button>
        <UserSurveyContext.Provider value={{ status }}>
          <SurveyForm
            onSubmit={async (source) => {
              setStatus("loading");
              try {
                await fetch("/api/user", {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ source }),
                });
                setStatus("success");
                setTimeout(() => {
                  update();
                  hide();
                }, 3000);
              } catch (e) {
                toast.error("Error saving response. Please try again.");
                setStatus("idle");
              }
            }}
          />
          <AnimatePresence>
            {status === "success" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center space-y-3 bg-white text-sm"
              >
                <CheckCircleFill className="h-8 w-8 text-green-500" />
                <p className="text-gray-500">Thank you for your response!</p>
              </motion.div>
            )}
          </AnimatePresence>
        </UserSurveyContext.Provider>
      </div>
    </AnimatedSizeContainer>
  );
}
