import { ModalProvider } from "@/ui/modals/modal-provider";
import { getUserCookieService } from "core/services/cookie/user-session.service.ts";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

const AppLayout = async ({ children }: { children: ReactNode }) => {
  const { sessionId } = await getUserCookieService();

  return (
    <SessionProvider>
      <ModalProvider sessionId={sessionId!}>{children}</ModalProvider>
    </SessionProvider>
  );
};

export default AppLayout;
