import { cn } from "@dub/utils";
import { cva } from "class-variance-authority";
import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { CardListContext } from "./card-list";

const cardListCardVariants = cva("w-full group/card border-gray-200 bg-white", {
  variants: {
    variant: {
      compact:
        "first-of-type:rounded-t-xl last-of-type:rounded-b-xl first-of-type:border-t border-b border-x data-[hover-state-enabled=true]:hover:bg-gray-50 transition-colors",
      loose:
        "border rounded-xl transition-[filter] data-[hover-state-enabled=true]:hover:drop-shadow-card-hover",
    },
  },
});

const cardListCardInnerClassName = "w-full py-2.5 px-4";

export const CardContext = createContext<{
  hovered: boolean;
}>({ hovered: false });

export function CardListCard({
  outerClassName,
  innerClassName,
  children,
  onClick,
  hoverStateEnabled = true,
}: PropsWithChildren<{
  outerClassName?: string;
  innerClassName?: string;
  onClick?: () => void;
  hoverStateEnabled?: boolean;
}>) {
  const { variant } = useContext(CardListContext);

  const ref = useRef<HTMLLIElement>(null);

  const [hovered, setHovered] = useState(false);

  // Detect when the card loses hover without an onPointerLeave (e.g. from a modal covering the element)
  useEffect(() => {
    if (!hovered || !ref.current) return;

    // Check every second while the card is expected to still be hovered
    const interval = setInterval(() => {
      if (ref.current?.matches(":hover") === false) setHovered(false);
    }, 1000);

    return () => clearInterval(interval);
  }, [hovered]);

  return (
    <li
      ref={ref}
      className={cn(cardListCardVariants({ variant }), outerClassName)}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      data-hover-state-enabled={hoverStateEnabled}
    >
      <div
        className={cn(cardListCardInnerClassName, innerClassName)}
        onClick={
          onClick
            ? (e) => {
                const existingModalBackdrop =
                  document.getElementById("modal-backdrop");

                // Don't trigger onClick if there's already an open modal
                if (existingModalBackdrop) {
                  return;
                }

                // Traverse up the DOM tree to see if there's a clickable element between this card and the click
                for (
                  let target = e.target as HTMLElement, i = 0;
                  target && target !== e.currentTarget && i < 100; // Only go 100 levels deep
                  target = target.parentElement as HTMLElement, i++
                ) {
                  // Don't trigger onClick if a clickable element inside the card was clicked
                  if (
                    ["button", "a", "input", "textarea"].includes(
                      target.tagName.toLowerCase(),
                    )
                  )
                    return;
                }

                onClick();
              }
            : undefined
        }
      >
        <CardContext.Provider value={{ hovered }}>
          {children}
        </CardContext.Provider>
      </div>
    </li>
  );
}
