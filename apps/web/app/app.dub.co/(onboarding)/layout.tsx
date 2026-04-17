import Toolbar from "@/ui/layout/toolbar/toolbar";
import { PropsWithChildren } from "react";
import { SignedInHint } from "./signed-in-hint";

export default function Layout({ children }: PropsWithChildren) {
  return (
    <>
      {children}
      <Toolbar show={["help"]} />
      <div className="hidden md:block">
        <SignedInHint />
      </div>
    </>
  );
}
