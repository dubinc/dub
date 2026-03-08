"use client";

import { Button } from "@dub/ui";

export function AddPostbackButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      className="flex h-10 items-center justify-center whitespace-nowrap rounded-lg border px-4 text-sm"
      text="Add Postback"
      onClick={onClick}
      aria-label="Add postback"
    />
  );
}
