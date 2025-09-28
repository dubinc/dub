import { KeyboardEvent, useCallback } from "react";

export function useEnterSubmit(formRef?: React.RefObject<HTMLFormElement | null>) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      // Check if CMD/CTRL + Enter is pressed
      if (event.key === "Enter" && event.metaKey) {
        event.preventDefault(); // Prevent the default behavior of 'Enter' key

        // Check if formRef is currently pointing to a form and if so, submit it
        if (formRef?.current) {
          formRef.current.requestSubmit();
          return;
        }

        // Try determining the form from the event target
        const form = (event.target as HTMLTextAreaElement).form;
        form?.requestSubmit();
      }
    },
    [],
  );

  return { handleKeyDown };
}
