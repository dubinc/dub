import { ReactNode } from "react";

export default function MaxWidthWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-w-screen-xl mx-auto px-5 sm:px-20">
      {children}
    </div>
  );
}
