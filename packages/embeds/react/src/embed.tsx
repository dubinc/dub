"use client";

import { DubOptions, init } from "@dub/embed-core";
import { HTMLProps, memo, useEffect, useId, useRef } from "react";

type Options = Omit<DubOptions, "token">;

type DubEmbedProps = {
  token: DubOptions["token"];
  options?: Options;
} & HTMLProps<HTMLDivElement>;

export const DubEmbed = memo(({ token, options, ...rest }: DubEmbedProps) => (
  <DubInline options={{ ...options, token }} {...rest} />
));

function DubInline({
  options,
  ...rest
}: { options: DubOptions } & HTMLProps<HTMLDivElement>) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;

    const { destroy } =
      init({
        id,
        root: rootRef.current,
        ...options,
      }) || {};

    return () => destroy?.();
  }, [id, options]);

  return <div {...rest} ref={rootRef} />;
}
