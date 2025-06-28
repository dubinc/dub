import Toolbar from "@/ui/layout/toolbar/toolbar";
import { PropsWithChildren } from "react";

export default function Layout({ children }: PropsWithChildren) {
  return (
    <>
      {children}
      <Toolbar show={["help"]} />
    </>
  );
}
