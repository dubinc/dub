import { useEffect, useState } from "react";

/**
 * Determines whether an <input> or <textarea> element is currently focused.
 */
export function useInputFocused() {
  const [isInputFocused, setIsInputFocused] = useState(true);

  useEffect(() => {
    const onFocusBlur = () => {
      const activeElement = document.activeElement;
      setIsInputFocused(
        activeElement?.tagName != null &&
          ["INPUT", "TEXTAREA"].includes(activeElement.tagName),
      );
    };

    window.addEventListener("focus", onFocusBlur, true);
    window.addEventListener("blur", onFocusBlur, true);

    return () => {
      window.removeEventListener("focus", onFocusBlur);
      window.removeEventListener("blur", onFocusBlur);
    };
  }, []);

  return isInputFocused;
}
