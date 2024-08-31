import Toolbar from "@/ui/layout/toolbar/toolbar";
import Providers from "app/providers";
import { PropsWithChildren } from "react";
import { Background } from "./background";

export default function Layout({ children }: PropsWithChildren) {
  return (
    <Providers>
      <Background />
      {children}
      <Toolbar show={["help"]} />
    </Providers>
  );
}
