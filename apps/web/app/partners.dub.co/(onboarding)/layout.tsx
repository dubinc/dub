import { NewBackground } from "@/ui/shared/new-background";
import { SessionProvider } from "next-auth/react";

export default function AdminAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="relative z-10 flex flex-col items-center justify-center">
        {children}
      </div>
      <NewBackground />
    </SessionProvider>
  );
}
