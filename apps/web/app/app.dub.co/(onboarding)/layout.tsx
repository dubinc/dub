import Toolbar from "@/ui/layout/toolbar/toolbar";
import { PropsWithChildren } from "react";
import { SignedInHint } from "./signed-in-hint";

export default function Layout({ children }: PropsWithChildren) {
  return (
    <>
      {children}
      <SignedInHint className="hidden md:block" />
      <div className="hidden md:block">
        <Toolbar show={["help"]} />
      </div>
    </>
  );
}
