"use client";

import { Button } from "@dub/ui";
import { Icon } from "@iconify/react";
import { useContext } from "react";
import { SideNavContext } from "../main-nav";

export function NavButton() {
  const { setIsOpen } = useContext(SideNavContext);

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => setIsOpen((o) => !o)}
      icon={
        <Icon
          className="h-5 w-5 text-neutral-200"
          icon="material-symbols:menu-rounded"
        />
      }
      className="h-auto w-fit p-1 md:hidden"
    />
  );
}
