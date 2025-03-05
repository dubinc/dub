"use client";

import { DubEmbedOptions, init } from "@dub/embed-core";
import { HTMLProps, memo, useEffect, useId, useRef } from "react";

type Options = Omit<DubEmbedOptions, "token">;

type DubEmbedProps = {
  token: DubEmbedOptions["token"];
  data: DubEmbedOptions["data"];
  theme?: DubEmbedOptions["theme"];
  options?: Options;
} & HTMLProps<HTMLDivElement>;

export const DubEmbed = memo(
  ({ token, data, theme, options, ...rest }: DubEmbedProps) => (
    <DubEmbedInner options={{ ...options, token, data, theme }} {...rest} />
  ),
);

function DubEmbedInner({
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
  }, [id, JSON.stringify(options)]);

  return <div {...rest} ref={rootRef} />;
}
