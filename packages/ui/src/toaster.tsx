"use client";

import { createPortal } from "react-dom";
import { Toaster } from "sonner";

type ToasterProps = React.ComponentProps<typeof Toaster>;

export const ToasterProvider = ({ ...props }: ToasterProps) => {
  const toasterContent = (
    <Toaster closeButton className="pointer-events-auto" />
  );

  // Only render in the browser
  if (typeof window === "undefined") return null;

  return createPortal(toasterContent, document.body);
};
