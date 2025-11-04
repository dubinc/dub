import { CircleQuestion } from "@dub/ui";

export async function HelpButton() {
  return (
    <a
      href="https://dub.co/contact/support"
      target="_blank"
      className="text-content-default hover:bg-bg-inverted/5 flex size-11 shrink-0 items-center justify-center rounded-lg"
    >
      <CircleQuestion className="size-5" strokeWidth={2} />
    </a>
  );
}
