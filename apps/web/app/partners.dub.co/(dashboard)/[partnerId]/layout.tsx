import { ReactNode } from "react";
import PartnerAuth from "./auth";

export default function PartnerLayout({ children }: { children: ReactNode }) {
  return <PartnerAuth>{children}</PartnerAuth>;
}
