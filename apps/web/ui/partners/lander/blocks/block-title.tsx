import { HTMLProps } from "react";

export function BlockTitle({
  title,
  ...rest
}: {
  title?: string;
} & HTMLProps<HTMLHeadingElement>) {
  return title ? (
    <h2 className="text-2xl font-semibold text-neutral-800" {...rest}>
      {title}
    </h2>
  ) : null;
}
