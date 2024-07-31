import { AnimatePresence, motion } from "framer-motion";
import { ReactNode, useEffect, useState } from "react";

export const ClientOnly = ({
  children,
  fallback,
  fadeInDuration = 0.5,
  className,
}: {
  children: ReactNode;
  fallback?: ReactNode;
  fadeInDuration?: number;
  className?: string;
}) => {
  const [clientReady, setClientReady] = useState<boolean>(false);

  useEffect(() => {
    setClientReady(true);
  }, []);

  const Comp = fadeInDuration ? motion.div : "div";

  return (
    <AnimatePresence>
      {clientReady ? (
        <Comp
          {...(fadeInDuration
            ? {
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                transition: { duration: fadeInDuration },
              }
            : {})}
          className={className}
        >
          {children}
        </Comp>
      ) : (
        fallback || null
      )}
    </AnimatePresence>
  );
};
