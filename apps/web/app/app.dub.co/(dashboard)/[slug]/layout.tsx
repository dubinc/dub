import { ReactNode } from "react";
import ProjectAuth from "./auth";

export default function ProjectLayout({ children }: { children: ReactNode }) {
  return <ProjectAuth>{children}</ProjectAuth>;
}
