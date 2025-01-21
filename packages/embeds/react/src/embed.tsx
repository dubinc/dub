"use client";

import { DubEmbedOptions, init } from "@dub/embed-core";
import { HTMLProps, memo, useEffect, useId, useRef } from "react";

type Options = Omit<DubEmbedOptions, "token">;

type DubEmbedProps = {
  token: DubEmbedOptions["token"];
  options?: Options;
} & HTMLProps<HTMLDivElement>;

export const DubEmbed = memo(({ token, options, ...rest }: DubEmbedProps) => (
  <DubInline options={{ ...options, token }} {...rest} />
));

function DubInline({
  options,
  ...rest
}: { options: DubEmbedOptions } & HTMLProps<HTMLDivElement>) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;

    const { destroy } =
      init({
        root: rootRef.current,
        ...options,
      }) || {};

    return () => destroy?.();
  }, [id, options]);

  return <div {...rest} ref={rootRef} />;
}
