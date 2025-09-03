import { ReactNode } from "react";
import ProgramAuth from "./auth";

export default function ProgramLayout({ children }: { children: ReactNode }) {
  return <ProgramAuth>{children}</ProgramAuth>;
}
