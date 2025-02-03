"use client";

import { ButtonProps, buttonVariants } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import { ComponentProps } from "react";

export function ButtonLink({
  variant,
  className,
  ...rest
}: Pick<ButtonProps, "variant"> & ComponentProps<typeof Link>) {
  return (
    <Link
      {...rest}
      className={cn(
        "flex h-10 w-fit items-center whitespace-nowrap rounded-lg border px-5 text-base",
        buttonVariants({ variant }),
        className,
      )}
    />
  );
}
