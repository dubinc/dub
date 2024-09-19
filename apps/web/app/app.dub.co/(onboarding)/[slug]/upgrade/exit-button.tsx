"use client";
import { X } from "@/ui/shared/icons";
import { useKeyboardShortcut } from "@dub/ui";
import { useRouter, useSearchParams } from "next/navigation";

export default function ExitButton() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const exit = searchParams.get("exit");

  const onExit = () => {
    if (exit === "close") window.close();
    else router.back();
  };

  useKeyboardShortcut("Escape", onExit);

  return (
    <button
      onClick={onExit}
      className="absolute right-3 top-3 p-2 hover:scale-110 active:scale-90"
    >
      <X className="size-5" />
    </button>
  );
}
