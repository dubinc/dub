"use client";

import { Button, LayoutSidebar } from "@dub/ui";
import { useContext } from "react";
import { SideNavContext } from "../main-nav";

export function NavButton() {
  const { setIsOpen } = useContext(SideNavContext);

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => setIsOpen((o) => !o)}
      icon={<LayoutSidebar className="size-4" />}
      className="h-auto w-fit p-1 md:hidden"
    />
  );
}
