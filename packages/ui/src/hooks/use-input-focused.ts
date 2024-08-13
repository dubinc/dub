import { useEffect, useState } from "react";

/**
 * Determines whether an <input> or <textarea> element is currently focused.
 */
export function useInputFocused() {
  const [isInputFocused, setIsInputFocused] = useState(false);

  useEffect(() => {
    const onFocusBlur = () => {
      const activeElement = document.activeElement;
      setIsInputFocused(
        activeElement?.tagName != null &&
          ["INPUT", "TEXTAREA"].includes(activeElement.tagName),
      );
    };

    window.addEventListener("focusin", onFocusBlur);
    window.addEventListener("focusout", onFocusBlur);

    return () => {
      window.removeEventListener("focusin", onFocusBlur);
      window.removeEventListener("focusout", onFocusBlur);
    };
  }, []);

  return isInputFocused;
}
