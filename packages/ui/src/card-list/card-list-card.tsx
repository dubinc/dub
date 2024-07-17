import { cn } from "@dub/utils";
import { cva } from "class-variance-authority";
import { PropsWithChildren, createContext, useContext, useState } from "react";
import { CardListContext } from "./card-list";

const cardListCardVariants = cva(
  "w-full py-2.5 px-4 group/card border-gray-200 bg-white",
  {
    variants: {
      variant: {
        compact:
          "first-of-type:rounded-t-xl last-of-type:rounded-b-xl first-of-type:border-t border-b border-x",
        loose:
          "border rounded-xl transition-[filter] hover:[filter:drop-shadow(0_8px_12px_#222A350d)_drop-shadow(0_32px_80px_#2f30370f)]",
      },
    },
  },
);

export const CardContext = createContext<{
  hovered: boolean;
}>({ hovered: false });

export function CardListCard({
  className,
  children,
}: PropsWithChildren<{ className?: string }>) {
  const { variant } = useContext(CardListContext);

  const [hovered, setHovered] = useState(false);

  return (
    <li
      className={cn(cardListCardVariants({ variant }), className)}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <CardContext.Provider value={{ hovered }}>
        {children}
      </CardContext.Provider>
    </li>
  );
}
