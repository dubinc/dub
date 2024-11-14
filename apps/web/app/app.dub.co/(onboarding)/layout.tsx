import Toolbar from "@/ui/layout/toolbar/toolbar";
import { NewBackground } from "@/ui/shared/new-background";
import { PropsWithChildren } from "react";

export default function Layout({ children }: PropsWithChildren) {
  return (
    <>
      <NewBackground />
      {children}
      <Toolbar show={["help"]} />
    </>
  );
}
