import { ReactNode } from "react";
import Meta from "../meta";
import { useSession, signOut } from "next-auth/react";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { data: session } = useSession();

  return (
    <div>
      <Meta />
      {children}
    </div>
  );
}
