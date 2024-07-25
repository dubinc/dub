import { cn } from "@dub/utils";
import { VariantProps, cva } from "class-variance-authority";
import { PropsWithChildren, createContext } from "react";

const cardListVariants = cva(
  "group/card-list w-full flex flex-col transition-[gap,opacity] min-w-0",
  {
    variants: {
      variant: {
        compact: "gap-0",
        loose: "gap-4",
      },
      loading: {
        true: "opacity-50",
      },
    },
  },
);

type CardListProps = PropsWithChildren<{
  loading?: boolean;
  className?: string;
}> &
  VariantProps<typeof cardListVariants>;

export const CardListContext = createContext<Pick<CardListProps, "variant">>({
  variant: "loose",
});

export function CardList({
  variant = "loose",
  loading = false,
  className,
  children,
}: CardListProps) {
  return (
    <ul
      className={cn(cardListVariants({ variant, loading }), className)}
      data-variant={variant}
    >
      <CardListContext.Provider value={{ variant }}>
        {children}
      </CardListContext.Provider>
    </ul>
  );
}
