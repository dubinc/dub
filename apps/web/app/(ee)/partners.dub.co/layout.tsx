import { ProgramSsoConnectModal } from "@/ui/auth/program-sso-connect-modal";
import { ReactNode, Suspense } from "react";

export default function PartnersLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      {children}
      <ProgramSsoConnectModal />
    </Suspense>
  );
}
