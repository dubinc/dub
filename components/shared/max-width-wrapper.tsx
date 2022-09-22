import { ReactNode } from "react";

export default function MaxWidthWrapper({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`w-full max-w-screen-xl mx-auto px-2.5 sm:px-20 ${className}`}
    >
      {children}
    </div>
  );
}
