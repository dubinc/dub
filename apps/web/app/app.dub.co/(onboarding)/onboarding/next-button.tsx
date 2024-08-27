"use client";

import { Button, ButtonProps } from "@dub/ui";
import { useRouter } from "next/navigation";

export function NextButton({ href, ...rest }: { href: string } & ButtonProps) {
  const router = useRouter();

  return (
    <Button
      variant="primary"
      text="Next"
      onClick={() => router.push(href)}
      {...rest}
    />
  );
}
