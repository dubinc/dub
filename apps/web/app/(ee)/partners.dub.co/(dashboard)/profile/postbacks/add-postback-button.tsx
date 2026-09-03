"use client";

import { Button } from "@dub/ui";

export function AddPostbackButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      className="h-9"
      text="Create Postback"
      onClick={onClick}
      aria-label="Create postback"
    />
  );
}
