import { KeyboardEvent } from "react";

export function useEnterSubmit(formRef: React.RefObject<HTMLFormElement>) {
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Check if CMD/CTRL + Enter is pressed
    if (event.key === "Enter" && event.metaKey) {
      event.preventDefault(); // Prevent the default behavior of 'Enter' key

      // Check if formRef is currently pointing to a form and if so, submit it
      if (formRef.current) {
        formRef.current.requestSubmit();
      }
    }
  };

  return { handleKeyDown };
}
