import { useEffect, useState } from "react";

export function useIframeVisibility() {
  const [isIframeVisible, setIsIframeVisible] = useState(false);

  useEffect(() => {
    const isInIframe = window !== window.parent;

    if (isInIframe) {
      const isInitiallyVisible =
        document.visibilityState === "visible" && !document.hidden;
      setIsIframeVisible(false);

      const handleVisibilityChange = () => {
        const isVisible =
          document.visibilityState === "visible" && !document.hidden;
        setIsIframeVisible(isVisible);
      };

      const handleFocus = () => {
        if (document.visibilityState === "visible" && !document.hidden) {
          setIsIframeVisible(true);
        }
      };

      const handleBlur = () => {
        setIsIframeVisible(false);
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("focus", handleFocus);
      window.addEventListener("blur", handleBlur);
      document.addEventListener("focus", handleFocus);
      document.addEventListener("blur", handleBlur);

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) {
            setIsIframeVisible(false);
          }
        },
        { threshold: [0] },
      );

      if (window.frameElement) {
        observer.observe(window.frameElement);
      }

      return () => {
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange,
        );
        window.removeEventListener("focus", handleFocus);
        window.removeEventListener("blur", handleBlur);
        document.removeEventListener("focus", handleFocus);
        document.removeEventListener("blur", handleBlur);
        observer.disconnect();
      };
    } else {
      setIsIframeVisible(true);
    }
  }, []);

  return isIframeVisible;
}
