import Toolbar from "@/ui/layout/toolbar/toolbar";
import { NewBackground } from "@/ui/shared/new-background";
import Providers from "app/providers";
import { PropsWithChildren } from "react";

export default function Layout({ children }: PropsWithChildren) {
  return (
    <Providers>
      <NewBackground />
      {children}
      <Toolbar show={["help"]} />
    </Providers>
  );
}
