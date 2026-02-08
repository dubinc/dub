import { ReactNode } from "react";

export default function InvitesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-bg-emphasis min-h-screen w-full sm:p-2">
      <div className="bg-bg-default relative flex min-h-[calc(100vh-1rem)] flex-col sm:rounded-xl">
        {children}
      </div>
    </div>
  );
}
