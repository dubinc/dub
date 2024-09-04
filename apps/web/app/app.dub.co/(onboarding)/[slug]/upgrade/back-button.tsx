"use client";
import { X } from "@/ui/shared/icons";
import { useKeyboardShortcut } from "@dub/ui";
import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();

  useKeyboardShortcut("Escape", () => router.back());

  return (
    <button
      onClick={() => router.back()}
      className="absolute right-3 top-3 p-2 hover:scale-110 active:scale-90"
    >
      <X className="size-5" />
    </button>
  );
}
