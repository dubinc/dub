import { AnimatePresence, motion } from "framer-motion";
import Cookies from "js-cookie";
import { ReactNode, createContext, useContext, useState } from "react";
import { ClientOnly } from "./client-only";

export const PopupContext = createContext<{
  hidePopup: () => void;
}>({
  hidePopup: () => {},
});

export function Popup({
  children,
  hiddenCookieId,
}: {
  children: ReactNode;
  hiddenCookieId: string;
}) {
  const [hidden, setHidden] = useState(Cookies.get(hiddenCookieId) === "1");
  const hidePopup = () => {
    setHidden(true);
    Cookies.set(hiddenCookieId, "1");
  };

  return (
    <ClientOnly>
      <PopupContext.Provider value={{ hidePopup }}>
        <AnimatePresence>
          {!hidden && (
            <motion.div
              className="fixed inset-0"
              initial={{ opacity: 0, translateY: 50 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ y: 250 }}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </PopupContext.Provider>
    </ClientOnly>
  );
}
